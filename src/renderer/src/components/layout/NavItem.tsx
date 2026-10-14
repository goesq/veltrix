import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '../../lib/cn'
import { IconButton } from '../ui/Button'

interface NavItemProps {
  icon: ReactNode
  label: string
  active: boolean
  /** Icon-only sidebar: the label becomes a tooltip. */
  collapsed: boolean
  badge?: string
  /** When defined, shows a chevron that collapses / expands the item's sub-list. */
  expanded?: boolean
  onToggle?(): void
  onSelect(): void
}

export function NavItem({
  icon,
  label,
  active,
  collapsed,
  badge,
  expanded,
  onToggle,
  onSelect,
}: NavItemProps) {
  const tone = active ? 'bg-raised text-fg' : 'text-muted hover:bg-raised/60 hover:text-fg'

  if (collapsed) {
    return (
      <button
        type="button"
        title={badge ? `${label} (${badge})` : label}
        aria-label={label}
        onClick={onSelect}
        className={cn('flex size-9 items-center justify-center rounded-md transition-colors', tone)}
      >
        {icon}
      </button>
    )
  }

  return (
    <div className={cn('flex h-9 items-center rounded-md transition-colors', tone)}>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'flex h-full min-w-0 flex-1 items-center gap-3 pl-2.5 text-left',
          expanded === undefined && 'pr-2.5',
        )}
      >
        {icon}
        <span>{label}</span>
        {badge && <span className="ml-auto pr-1 font-mono text-[11px] text-faint">{badge}</span>}
      </button>
      {expanded !== undefined && (
        <IconButton
          label={expanded ? 'Recolher lista' : 'Expandir lista'}
          onClick={onToggle}
          className="mr-1 size-6"
        >
          <ChevronRight size={13} className={cn('transition-transform', expanded && 'rotate-90')} />
        </IconButton>
      )}
    </div>
  )
}
