import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { isMac } from '../../lib/api'
import { terminalTheme } from '../../lib/terminalTheme'
import { useSettings } from '../../stores/settings'

interface XTermViewProps {
  /** Connects the view to its data source; returns a cleanup function. */
  subscribe(write: (data: string) => void): () => void
  /** Keyboard input. Omit for a read-only view. */
  onInput?(data: string): void
  onResize?(cols: number, rows: number): void
  /** When it becomes true the terminal is refit and focused. */
  focused?: boolean
}

/** xterm.js wrapper that keeps itself sized to its container. */
export function XTermView({ subscribe, onInput, onResize, focused }: XTermViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const fontSize = useSettings((s) => s.settings?.terminalFontSize ?? 13)

  // Callbacks change identity on every render; read them through refs inside xterm handlers.
  const callbacks = useRef({ onInput, onResize })
  callbacks.current = { onInput, onResize }

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
    terminal.attachCustomKeyEventHandler((event) => handleClipboardKeys(terminal, event))

    const input = terminal.onData((data) => callbacks.current.onInput?.(data))
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
