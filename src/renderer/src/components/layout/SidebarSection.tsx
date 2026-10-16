import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { NavItem } from './NavItem'

interface SidebarSectionProps {
  label: string
  /** Shown instead of the label in the icon-only sidebar. */
  icon: ReactNode
  collapsed: boolean
  active: boolean
  onSelect(): void
  /** Shown beside the label, e.g. a "Beta" badge. Hidden in the icon-only sidebar. */
  badge?: ReactNode
  /** Buttons on the right of the heading, e.g. "+". Hidden in the icon-only sidebar. */
  actions?: ReactNode
  children: ReactNode
}

/** A sidebar list ("Terminais", "Projetos"): a clickable heading with actions, then its items. */
export function SidebarSection({
  label,
  icon,
  collapsed,
  active,
  onSelect,
  badge,
  actions,
  children,
}: SidebarSectionProps) {
  if (collapsed) {
    return (
      <section className="flex flex-col items-center gap-1">
        <NavItem collapsed icon={icon} label={label} active={active} onSelect={onSelect} />
        {children}
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-0.5">
      <div className="flex h-8 items-center pl-3 pr-0.5">
        <button
          type="button"
          onClick={onSelect}
          className={cn(
            'text-[13px] font-medium transition-colors hover:text-fg',
            active ? 'text-fg' : 'text-faint',
          )}
        >
          {label}
        </button>
        {badge && <span className="ml-2 flex items-center">{badge}</span>}
        <div className="ml-auto flex items-center">{actions}</div>
      </div>
      {children}
    </section>
  )
}
