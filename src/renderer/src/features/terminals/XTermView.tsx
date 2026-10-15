import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { isMac } from '../../lib/api'
import { cwdFromOsc7 } from '../../lib/cwd'
import { terminalTheme } from '../../lib/terminalTheme'
import { useSettings } from '../../stores/settings'

interface XTermViewProps {
  /** Connects the view to its data source; returns a cleanup function. */
  subscribe(write: (data: string) => void): () => void
  /** Keyboard input. Omit for a read-only view. */
  onInput?(data: string): void
  onResize?(cols: number, rows: number): void
  /** Working directory reported by the shell (OSC 7). */
  onCwd?(cwd: string): void
  /** When it becomes true the terminal is refit and focused. */
  focused?: boolean
}

/** xterm.js wrapper that keeps itself sized to its container. */
export function XTermView({ subscribe, onInput, onResize, onCwd, focused }: XTermViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const fontSize = useSettings((s) => s.settings?.terminalFontSize ?? 13)

  // Callbacks change identity on every render; read them through refs inside xterm handlers.
  const callbacks = useRef({ onInput, onResize, onCwd })
  callbacks.current = { onInput, onResize, onCwd }

  useEffect(() => {
    const container = containerRef.current!
    const terminal = new Terminal({
      fontFamily: getComputedStyle(document.body).getPropertyValue('--font-mono'),
      fontSize,
      lineHeight: 1.25,
      cursorBlink: true,
      allowProposedApi: true,
      disableStdin: !callbacks.current.onInput,
      scrollback: 10000,
      theme: terminalTheme,
    })
    const fit = new FitAddon()
    terminal.loadAddon(fit)
    terminal.loadAddon(new WebLinksAddon((_event, uri) => window.open(uri)))
    terminal.open(container)
    loadWebglRenderer(terminal)
    terminal.attachCustomKeyEventHandler((event) => handleClipboardKeys(terminal, event))

    const input = terminal.onData((data) => callbacks.current.onInput?.(data))
    const cwdReports = terminal.parser.registerOscHandler(7, (payload) => {
      const cwd = cwdFromOsc7(payload)
      if (cwd) callbacks.current.onCwd?.(cwd)
      return true
    })
    const resize = terminal.onResize(({ cols, rows }) => callbacks.current.onResize?.(cols, rows))
    const unsubscribe = subscribe((data) => terminal.write(data))

    const refit = (): void => {
      if (container.offsetWidth > 0 && container.offsetHeight > 0) fit.fit()
    }
    const observer = new ResizeObserver(refit)
    observer.observe(container)
    refit()
    callbacks.current.onResize?.(terminal.cols, terminal.rows)

    terminalRef.current = terminal
    fitRef.current = fit
    return () => {
      observer.disconnect()
      unsubscribe()
      input.dispose()
      cwdReports.dispose()
      resize.dispose()
      terminal.dispose()
      terminalRef.current = null
    }
    // The terminal is created once per mount; data source identity is stable per view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const terminal = terminalRef.current
    if (!terminal) return
    terminal.options.fontSize = fontSize
    fitRef.current?.fit()
  }, [fontSize])

  useEffect(() => {
    if (!focused) return
    requestAnimationFrame(() => {
      fitRef.current?.fit()
      terminalRef.current?.focus()
    })
  }, [focused])

  return <div ref={containerRef} className="selectable h-full w-full overflow-hidden" />
}

/**
 * Copy/paste that feels native on each OS: on Windows, Ctrl+C copies when there is a
 * selection (otherwise it is sent as SIGINT) and Ctrl+V pastes. macOS uses ⌘ natively.
 */
function handleClipboardKeys(terminal: Terminal, event: KeyboardEvent): boolean {
  if (isMac || event.type !== 'keydown' || !event.ctrlKey || event.altKey) return true
  const key = event.key.toLowerCase()

  if (key === 'c' && terminal.hasSelection()) {
    void navigator.clipboard.writeText(terminal.getSelection())
    terminal.clearSelection()
    return false
  }
  // Returning false lets the browser fire its native paste event, which xterm handles.
  if (key === 'v') return false
  return true
}

/**
 * Renders with WebGL: faster, and box-drawing / block characters are drawn as custom glyphs
 * that fill the whole cell, so banners and TUIs connect across lines despite the line height.
 * Falls back to the DOM renderer when WebGL is unavailable or its context is lost.
 */
function loadWebglRenderer(terminal: Terminal): void {
  try {
    const webgl = new WebglAddon()
    webgl.onContextLoss(() => webgl.dispose())
    terminal.loadAddon(webgl)
  } catch {
    // No WebGL: xterm keeps its DOM renderer.
  }
}
