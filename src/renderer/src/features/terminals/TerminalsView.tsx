import { SquareTerminal, X } from 'lucide-react'
import { MAX_TERMINALS } from '@shared/constants'
import { Button, IconButton } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { cn } from '../../lib/cn'
import { useTerminals, workspaceTabs } from '../../stores/terminals'
import { TerminalPane } from './TerminalPane'

/** Columns used by the grid layout for a given number of terminals (max 10). */
function gridColumns(count: number): number {
  if (count <= 1) return 1
  if (count <= 4) return 2
  if (count <= 9) return 3
  return 4
}

/** The terminals listed in the sidebar, one at a time or all in a grid. */
export function TerminalsView() {
  const { tabs: allTabs, activeId, layout, open, error, dismissError } = useTerminals()
  const tabs = workspaceTabs(allTabs)
  const grid = layout === 'grid' && tabs.length > 1

  return (
    <div className="flex h-full flex-col">
      {error && (
        <div className="mx-3 mt-3 flex items-center justify-between rounded-md border border-danger/30 bg-danger/10 px-3 py-1.5 text-danger">
          <span>{error}</span>
          <IconButton label="Dispensar" onClick={dismissError}>
            <X size={14} />
          </IconButton>
        </div>
      )}

      {tabs.length === 0 ? (
        <EmptyState
          icon={<SquareTerminal size={20} />}
          title="Nenhum terminal aberto"
          description={`Abra até ${MAX_TERMINALS} terminais e alterne entre eles pela barra lateral ou pelos atalhos.`}
          action={
            <Button variant="primary" onClick={() => void open()}>
              Novo terminal
            </Button>
          }
        />
      ) : (
        <div
          className={cn('grid min-h-0 flex-1 auto-rows-fr gap-2 p-3', !grid && 'grid-cols-1')}
          style={
            grid
              ? { gridTemplateColumns: `repeat(${gridColumns(tabs.length)}, minmax(0, 1fr))` }
              : undefined
          }
        >
          {/* All panes stay mounted so shells keep their screen state; single mode hides the rest. */}
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={cn('min-h-0 min-w-0', !grid && tab.id !== activeId && 'hidden')}
            >
              <TerminalPane tab={tab} active={tab.id === activeId} showHeader={grid} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
