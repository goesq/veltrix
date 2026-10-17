import { useT } from '../../i18n'
import { cn } from '../../lib/cn'
import { useCanvasActions } from './canvasActions'

/** Where a node lifted into a panel normally sits; clicking it puts the node back. */
export function LiftedPlaceholder({ selected }: { selected?: boolean }) {
  const { lift } = useCanvasActions()
  const t = useT()
  return (
    <button
      type="button"
      onClick={() => lift(null)}
      className={cn(
        'flex h-full w-full items-center justify-center rounded-lg border border-dashed border-line-strong bg-panel/40 text-xs text-faint',
        selected && 'canvas-node-selected',
      )}
    >
      {t.canvas.liftedHere}
    </button>
  )
}
