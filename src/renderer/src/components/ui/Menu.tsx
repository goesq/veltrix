import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface MenuItem {
  id: string
  label: string
  hint?: string
  onSelect(): void
}

interface MenuProps {
  /** Renders the trigger; call `toggle` to open or close the menu. */
  trigger(props: { open: boolean; toggle(): void }): ReactNode
  items: MenuItem[]
  align?: 'left' | 'right'
}

/** Minimal dropdown menu that closes on selection, outside click or Escape. */
export function Menu({ trigger, items, align = 'left' }: MenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      {trigger({ open, toggle: () => setOpen((value) => !value) })}
      {open && (
        <ul
          role="menu"
          className={cn(
            'absolute top-full z-40 mt-1 min-w-56 rounded-lg border border-line bg-panel p-1 shadow-lg shadow-black/30',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item) => (
            <li key={item.id} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  item.onSelect()
                }}
                className="flex h-8 w-full items-center gap-6 rounded-md px-2.5 text-left text-muted transition-colors hover:bg-raised hover:text-fg"
              >
                <span className="flex-1 truncate">{item.label}</span>
                {item.hint && <span className="text-xs text-faint">{item.hint}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
