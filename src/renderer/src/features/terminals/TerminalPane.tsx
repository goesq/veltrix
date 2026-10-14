import { useCallback } from 'react'
import { Maximize2, X } from 'lucide-react'
import { IconButton } from '../../components/ui/Button'
import { StatusDot } from '../../components/ui/StatusDot'
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
}

export function TerminalPane({ tab, active, showHeader }: TerminalPaneProps) {
  const { focus, close, setLayout } = useTerminals()
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
        <header className="flex h-9 shrink-0 items-center gap-2 border-b border-line pl-3 pr-1.5">
          <StatusDot className={tagDot[tab.color]} />
          <span className={cn('truncate', active ? 'text-fg' : 'text-muted')}>{tab.title}</span>
          <div className="ml-auto flex items-center">
            <IconButton
              label="Maximizar"
              onClick={() => {
                focus(tab.id)
                setLayout('single')
              }}
            >
              <Maximize2 size={13} />
            </IconButton>
            <IconButton label="Fechar terminal" onClick={() => void close(tab.id)}>
              <X size={14} />
            </IconButton>
          </div>
        </header>
      )}
      <div className="relative min-h-0 flex-1">
        <XTermView
          subscribe={subscribe}
          onInput={(data) => api.terminal.write(tab.id, data)}
          onResize={(cols, rows) => api.terminal.resize(tab.id, cols, rows)}
          focused={active}
        />
        {tab.exitCode !== undefined && (
          <div className="absolute bottom-3 right-3 rounded-md border border-line bg-panel px-2.5 py-1 text-xs text-muted">
            Processo encerrado (código {tab.exitCode})
          </div>
        )}
      </div>
    </section>
  )
}
