import { useCallback, type PointerEvent } from 'react'
import { EyeOff, Maximize2, X } from 'lucide-react'
import { IconButton } from '../../components/ui/Button'
import { StatusDot } from '../../components/ui/StatusDot'
import { useT } from '../../i18n'
import { api } from '../../lib/api'
import { cn } from '../../lib/cn'
import { tagDot } from '../../lib/colors'
import { terminalBus } from '../../lib/terminalBus'
import { useTerminals, type TerminalTab } from '../../stores/terminals'
import { XTermView } from './XTermView'

interface TerminalPaneProps {
  tab: TerminalTab
  active: boolean
  /** Show the pane header (grid layout). */
  showHeader: boolean
  /** Pressing the header starts dragging the pane to another place (grid layout). */
  onHeaderPointerDown?(event: PointerEvent<HTMLElement>): void
  /** Grid layout: takes the pane off the screen (the terminal keeps running). */
  onHide?(): void
}

export function TerminalPane({
  tab,
  active,
  showHeader,
  onHeaderPointerDown,
  onHide,
}: TerminalPaneProps) {
  const { focus, close, setLayout, trackInput, setCwd } = useTerminals()
  const t = useT()
  const subscribe = useCallback(
    (write: (data: string) => void) => terminalBus.attach(tab.id, write),
    [tab.id],
  )

  return (
    <section
      onMouseDown={() => focus(tab.id)}
      className={cn(
        'flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border bg-surface transition-colors',
        showHeader && active ? 'border-line-strong' : 'border-line',
      )}
    >
      {showHeader && (
        <header
          onPointerDown={onHeaderPointerDown}
          title={onHeaderPointerDown ? t.terminals.dragToReorder : undefined}
          className={cn(
            'flex h-9 shrink-0 items-center gap-2 border-b border-line pl-3 pr-1.5',
            onHeaderPointerDown && 'cursor-grab',
          )}
        >
          <StatusDot className={tagDot[tab.color]} />
          <span className={cn('truncate', active ? 'text-fg' : 'text-muted')}>{tab.title}</span>
          <div className="ml-auto flex items-center">
            {onHide && (
              <IconButton label={t.terminals.hideFromGrid} onClick={onHide}>
                <EyeOff size={13} />
              </IconButton>
            )}
            <IconButton
              label={t.terminals.maximize}
              onClick={() => {
                focus(tab.id)
                setLayout('single')
              }}
            >
              <Maximize2 size={13} />
            </IconButton>
            <IconButton label={t.terminals.close} onClick={() => void close(tab.id)}>
              <X size={14} />
            </IconButton>
          </div>
        </header>
      )}
      <div className="relative min-h-0 flex-1">
        <XTermView
          subscribe={subscribe}
          onInput={(data) => {
            api.terminal.write(tab.id, data)
            trackInput(tab.id, data)
          }}
          onResize={(cols, rows) => api.terminal.resize(tab.id, cols, rows)}
          onCwd={(cwd) => setCwd(tab.id, cwd)}
          focused={active}
        />
        {tab.exitCode !== undefined && (
          <div className="absolute bottom-3 right-3 rounded-md border border-line bg-panel px-2.5 py-1 text-xs text-muted">
            {t.terminals.exited(tab.exitCode)}
          </div>
        )}
      </div>
    </section>
  )
}
