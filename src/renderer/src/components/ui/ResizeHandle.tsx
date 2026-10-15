import { useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { useT } from '../../i18n'
import { cn } from '../../lib/cn'

interface ResizeHandleProps {
  /** `x` sits between side-by-side panes (drags left/right); `y` between stacked ones. */
  axis: 'x' | 'y'
  onDragStart(): void
  /** Pixels moved since the drag started. */
  onDrag(delta: number): void
  onDragEnd(): void
  /** Double-click: back to the default sizes. */
  onReset(): void
  /** Draw the divider line at rest; otherwise it only shows on hover and while dragging. */
  showLine?: boolean
  className?: string
  style?: CSSProperties
}

const KEYBOARD_STEP = 24

/**
 * Invisible hit area with a thin divider line in the middle. The parent owns the sizes:
 * it snapshots them on drag start and applies the delta on every move.
 */
export function ResizeHandle({
  axis,
  onDragStart,
  onDrag,
  onDragEnd,
  onReset,
  showLine,
  className,
  style,
}: ResizeHandleProps) {
  const [dragging, setDragging] = useState(false)
  const t = useT()
  const cursor = axis === 'x' ? 'col-resize' : 'row-resize'

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    const handle = event.currentTarget
    const origin = axis === 'x' ? event.clientX : event.clientY
    handle.setPointerCapture(event.pointerId)
    // Keep the resize cursor even when the pointer runs ahead of the handle.
    document.body.style.cursor = cursor
    setDragging(true)
    onDragStart()

    const move = (e: globalThis.PointerEvent): void =>
      onDrag((axis === 'x' ? e.clientX : e.clientY) - origin)
    const end = (): void => {
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', end)
      handle.removeEventListener('pointercancel', end)
      document.body.style.cursor = ''
      setDragging(false)
      onDragEnd()
    }
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', end)
    handle.addEventListener('pointercancel', end)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const keys = axis === 'x' ? ['ArrowLeft', 'ArrowRight'] : ['ArrowUp', 'ArrowDown']
    const direction = keys.indexOf(event.key)
    if (direction === -1) return
    event.preventDefault()
    onDragStart()
    onDrag(direction === 0 ? -KEYBOARD_STEP : KEYBOARD_STEP)
    onDragEnd()
  }

  return (
    <div
      role="separator"
      aria-orientation={axis === 'x' ? 'vertical' : 'horizontal'}
      aria-label={t.common.resize}
      title={t.common.resize}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onDoubleClick={onReset}
      onKeyDown={handleKeyDown}
      className={cn(
        'group absolute z-10 flex touch-none items-center justify-center outline-none',
        axis === 'x' ? 'cursor-col-resize flex-row' : 'cursor-row-resize flex-col',
        className,
      )}
      style={style}
    >
      <span
        className={cn(
          'pointer-events-none rounded-full transition-colors',
          axis === 'x' ? 'h-full w-px' : 'h-px w-full',
          dragging
            ? 'bg-muted'
            : cn(
                showLine ? 'bg-line' : 'bg-transparent',
                'group-hover:bg-line-strong group-focus-visible:bg-line-strong',
              ),
        )}
      />
    </div>
  )
}
