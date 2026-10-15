import { useRef, useState, type CSSProperties } from 'react'
import { SquareTerminal, X } from 'lucide-react'
import { MAX_TERMINALS } from '@shared/constants'
import { Button, IconButton } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { ResizeHandle } from '../../components/ui/ResizeHandle'
import { useT } from '../../i18n'
import { cn } from '../../lib/cn'
import { loadSizes, resizePair, saveSizes } from '../../lib/layoutSizes'
import { useTerminals, workspaceTabs } from '../../stores/terminals'
import { TerminalPane } from './TerminalPane'

/** Columns used by the grid layout for a given number of terminals (max 10). */
function gridColumns(count: number): number {
  if (count <= 1) return 1
  if (count <= 4) return 2
  if (count <= 9) return 3
  return 4
}

/** Padding around the grid and gap between panes, in pixels (as `p-3` / `gap-2`). */
const PADDING = 12
const GAP = 8
/** Smallest a pane can be dragged to. */
const MIN_PANE_WIDTH = 240
const MIN_PANE_HEIGHT = 120

/** How many panes each row of the grid holds; the last row may be shorter. */
function rowShape(count: number): number[] {
  const columns = gridColumns(count)
  const shape: number[] = []
  for (let left = count; left > 0; left -= columns) shape.push(Math.min(columns, left))
  return shape
}

/**
 * Relative sizes of the grid: row heights, and each row's own pane widths, so moving a
 * divider in one row leaves the other rows alone.
 */
interface GridSizes {
  id: string
  rows: number[]
  columns: number[][]
}

const equal = (count: number): number[] => Array<number>(count).fill(1)

function loadGrid(shape: number[]): GridSizes {
  const id = `terminals.grid.${shape.join('-')}`
  return {
    id,
    rows: loadSizes(`${id}.rows`, equal(shape.length)),
    columns: shape.map((count, row) => loadSizes(`${id}.row${row}`, equal(count))),
  }
}

/** Offset and length of track `index` along one axis, as CSS lengths inside the padded grid. */
function track(sizes: number[], index: number): { offset: string; length: string } {
  const total = sizes.reduce((sum, n) => sum + n, 0)
  const before = sizes.slice(0, index).reduce((sum, n) => sum + n, 0)
  const free = `(100% - ${PADDING * 2 + (sizes.length - 1) * GAP}px)`
  return {
    offset: `calc(${PADDING + index * GAP}px + ${free} * ${before / total})`,
    length: `calc(${free} * ${sizes[index] / total})`,
  }
}

/** Where the divider after track `index` goes: centered on the gap, a little wider than it. */
function boundary(sizes: number[], index: number): string {
  const { offset, length } = track(sizes, index)
  return `calc(${offset} + ${length} - 2px)`
}

/**
 * Pane sizes of the grid layout, remembered per shape (2+2, 3+3+2…). Dragging a divider
 * trades space between the two panes (or rows) beside it; the xterms refit on their own.
 */
function useGridSizes(shape: number[]) {
  const containerRef = useRef<HTMLDivElement>(null)
  const id = `terminals.grid.${shape.join('-')}`
  const [stored, setStored] = useState(() => loadGrid(shape))
  const sizes = stored.id === id ? stored : loadGrid(shape)
  const dragStart = useRef<GridSizes>(sizes)
  const latest = useRef<GridSizes>(sizes)
  latest.current = sizes

  /** `row` undefined: the divider between rows `index` and `index + 1`. Otherwise the one
   * between panes `index` and `index + 1` of that row. */
  const handle = (index: number, row?: number) => {
    const vertical = row === undefined
    const read = (s: GridSizes): number[] => (vertical ? s.rows : s.columns[row])
    const write = (s: GridSizes, next: number[]): GridSizes =>
      vertical
        ? { ...s, rows: next }
        : { ...s, columns: s.columns.map((c, r) => (r === row ? next : c)) }
    const save = (s: GridSizes): void =>
      saveSizes(`${s.id}.${vertical ? 'rows' : `row${row}`}`, read(s))
    const available = (): number => {
      const el = containerRef.current
      if (!el) return 0
      const length = vertical ? el.clientHeight : el.clientWidth
      return length - PADDING * 2 - (read(sizes).length - 1) * GAP
    }
    return {
      axis: vertical ? ('y' as const) : ('x' as const),
      onDragStart: () => {
        dragStart.current = sizes
      },
      onDrag: (delta: number) => {
        const start = dragStart.current
        const min = vertical ? MIN_PANE_HEIGHT : MIN_PANE_WIDTH
        setStored(write(start, resizePair(read(start), index, delta, available(), min)))
      },
      onDragEnd: () => save(latest.current),
      onReset: () => {
        const next = write(sizes, equal(read(sizes).length))
        setStored(next)
        save(next)
      },
    }
  }

  return { containerRef, sizes, handle }
}

/** The terminals listed in the sidebar, one at a time or all in a grid. */
export function TerminalsView() {
  const { tabs: allTabs, activeId, layout, open, error, dismissError } = useTerminals()
  const tabs = workspaceTabs(allTabs)
  const t = useT()
  const grid = layout === 'grid' && tabs.length > 1
  const shape = grid ? rowShape(tabs.length) : [1]
  const { containerRef, sizes, handle } = useGridSizes(shape)
  const columns = gridColumns(tabs.length)

  /** Absolute placement of pane `index` in the grid layout. */
  const placement = (index: number): CSSProperties => {
    const row = Math.floor(index / columns)
    const x = track(sizes.columns[row], index % columns)
    const y = track(sizes.rows, row)
    return { left: x.offset, width: x.length, top: y.offset, height: y.length }
  }

  return (
    <div className="flex h-full flex-col">
      {error && (
        <div className="mx-3 mt-3 flex items-center justify-between rounded-md border border-danger/30 bg-danger/10 px-3 py-1.5 text-danger">
          <span>{error}</span>
          <IconButton label={t.common.dismiss} onClick={dismissError}>
            <X size={14} />
          </IconButton>
        </div>
      )}

      {tabs.length === 0 ? (
        <EmptyState
          icon={<SquareTerminal size={20} />}
          title={t.terminals.emptyTitle}
          description={t.terminals.emptyDescription(MAX_TERMINALS)}
          action={
            <Button variant="primary" onClick={() => void open()}>
              {t.terminals.newTerminal}
            </Button>
          }
        />
      ) : (
        <div
          ref={containerRef}
          className={cn(
            'relative min-h-0 flex-1',
            !grid && 'grid grid-cols-1 auto-rows-fr gap-2 p-3',
          )}
        >
          {/* All panes stay mounted (same element in both layouts) so shells keep their screen
              state; single mode hides the rest, the grid places each pane absolutely. */}
          {tabs.map((tab, index) => (
            <div
              key={tab.id}
              className={cn(
                'min-h-0 min-w-0',
                grid && 'absolute',
                !grid && tab.id !== activeId && 'hidden',
              )}
              style={grid ? placement(index) : undefined}
            >
              <TerminalPane tab={tab} active={tab.id === activeId} showHeader={grid} />
            </div>
          ))}
          {grid &&
            sizes.rows.map((_, row) => {
              const y = track(sizes.rows, row)
              return sizes.columns[row].slice(0, -1).map((_, i) => (
                <ResizeHandle
                  key={`row${row}-column${i}`}
                  {...handle(i, row)}
                  className="w-3"
                  style={{
                    left: boundary(sizes.columns[row], i),
                    top: y.offset,
                    height: y.length,
                  }}
                />
              ))
            })}
          {grid &&
            sizes.rows.slice(0, -1).map((_, i) => (
              <ResizeHandle
                key={`row-${i}`}
                {...handle(i)}
                className="h-3"
                style={{
                  top: boundary(sizes.rows, i),
                  left: PADDING,
                  right: PADDING,
                }}
              />
            ))}
        </div>
      )}
    </div>
  )
}
