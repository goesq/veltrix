import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/cn'

export interface MenuItem {
  id: string
  label: string
  hint?: string
  /** Destructive action, shown in red. */
  danger?: boolean
  onSelect(): void
}

interface MenuProps {
  /** Renders the trigger; call `toggle` to open or close the menu. */
  trigger(props: { open: boolean; toggle(): void }): ReactNode
  items: MenuItem[]
  /** Which edge of the trigger the menu lines up with; it still shifts to stay inside the window. */
  align?: 'left' | 'right'
  /** Right-clicking this element opens the same menu at the pointer. */
  contextTarget?: RefObject<HTMLElement | null>
}

/** Where the open menu is attached: below its trigger, or at the pointer of a right-click. */
type Anchor = { kind: 'trigger' } | { kind: 'point'; x: number; y: number }

/** Space between the trigger and the menu, and between the menu and the window edges. */
const GAP = 4
const MARGIN = 8

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), Math.max(min, max))

/**
 * Minimal dropdown menu that closes on selection, outside click or Escape.
 * It renders in a portal with fixed positioning, so scrolling or clipped containers
 * (like the sidebar) never cut it off, and it flips to whichever side has room.
 */
export function Menu({ trigger, items, align = 'left', contextTarget }: MenuProps) {
  const [anchor, setAnchor] = useState<Anchor | null>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const open = anchor !== null

  useEffect(() => {
    const target = contextTarget?.current
    if (!target) return
    const onContextMenu = (event: MouseEvent): void => {
      event.preventDefault()
      setAnchor({ kind: 'point', x: event.clientX, y: event.clientY })
    }
    target.addEventListener('contextmenu', onContextMenu)
    return () => target.removeEventListener('contextmenu', onContextMenu)
  }, [contextTarget])

  useLayoutEffect(() => {
    if (!anchor) {
      setPosition(null)
      return
    }
    const place = (): void => {
      const list = listRef.current?.getBoundingClientRect()
      const box = rootRef.current?.getBoundingClientRect()
      if (!list || !box) return
      // A right-click opens at the pointer; the trigger opens below (or above) itself.
      const from =
        anchor.kind === 'point'
          ? { left: anchor.x, right: anchor.x, top: anchor.y, bottom: anchor.y }
          : box
      const gap = anchor.kind === 'point' ? 0 : GAP
      const left =
        anchor.kind === 'point'
          ? from.left + list.width <= window.innerWidth - MARGIN
            ? from.left
            : from.left - list.width
          : align === 'right'
            ? from.right - list.width
            : from.left
      const below = from.bottom + gap
      const fitsBelow = below + list.height <= window.innerHeight - MARGIN
      const top = fitsBelow ? below : from.top - gap - list.height
      setPosition({
        left: clamp(left, MARGIN, window.innerWidth - MARGIN - list.width),
        top: clamp(top, MARGIN, window.innerHeight - MARGIN - list.height),
      })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [anchor, align])

  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent): void => {
      const target = event.target as Node
      // The trigger toggles on its own click; any other press outside the list closes.
      const onTrigger = anchor?.kind === 'trigger' && rootRef.current?.contains(target)
      if (!onTrigger && !listRef.current?.contains(target)) setAnchor(null)
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setAnchor(null)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, anchor])

  return (
    <div ref={rootRef}>
      {trigger({
        open,
        toggle: () => setAnchor((current) => (current ? null : { kind: 'trigger' })),
      })}
      {open &&
        createPortal(
          <ul
            ref={listRef}
            role="menu"
            // Rendered once unplaced to measure it, then moved into view before paint.
            style={{ top: position?.top ?? 0, left: position?.left ?? 0 }}
            className={cn(
              'fixed z-40 max-h-[calc(100vh-16px)] min-w-56 overflow-y-auto rounded-lg border border-line bg-panel p-1 shadow-lg shadow-black/30',
              !position && 'invisible',
            )}
          >
            {items.map((item) => (
              <li key={item.id} role="none">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setAnchor(null)
                    item.onSelect()
                  }}
                  className={cn(
                    'flex h-8 w-full items-center gap-6 rounded-md px-2.5 text-left transition-colors',
                    item.danger
                      ? 'text-danger hover:bg-danger/10'
                      : 'text-muted hover:bg-raised hover:text-fg',
                  )}
                >
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.hint && <span className="text-xs text-faint">{item.hint}</span>}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  )
}
