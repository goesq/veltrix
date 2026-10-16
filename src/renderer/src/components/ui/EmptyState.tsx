import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  /** Shown beside the title, e.g. a "Beta" badge. */
  badge?: ReactNode
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, badge, description, action }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="flex size-11 items-center justify-center rounded-lg border border-line bg-panel text-muted">
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="flex items-center justify-center gap-2 text-sm font-semibold">
          {title}
          {badge}
        </h3>
        {description && <p className="max-w-sm text-[13px] text-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}
