import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface NavItemProps {
  icon: ReactNode
  label: string
  active: boolean
  /** Icon-only sidebar: the label becomes a tooltip. */
  collapsed: boolean
  onSelect(): void
}

export function NavItem({ icon, label, active, collapsed, onSelect }: NavItemProps) {
  const tone = active ? 'bg-raised text-fg' : 'text-muted hover:bg-raised/60 hover:text-fg'

  return (
    <button
      type="button"
      title={collapsed ? label : undefined}
      aria-label={label}
      onClick={onSelect}
      className={cn(
        'flex items-center rounded-md transition-colors',
        collapsed ? 'size-9 justify-center' : 'h-10 gap-3 px-3 text-left text-sm',
        tone,
      )}
    >
      {icon}
      {!collapsed && <span>{label}</span>}
    </button>
  )
}
