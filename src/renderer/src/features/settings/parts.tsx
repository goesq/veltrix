import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export const selectClass =
  'h-9 rounded-md border border-line bg-surface px-2.5 text-[13px] text-fg hover:border-line-strong focus:border-line-strong focus:outline-none'

/** One settings section: its title and what it is about, then its content. */
export function SettingsPage({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-base font-semibold">{title}</h1>
        <p className="mt-1 text-muted">{description}</p>
      </header>
      {children}
    </div>
  )
}

/** A group of related settings inside a section. */
export function SettingsCard({
  title,
  hint,
  children,
  className,
}: {
  title?: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className="flex flex-col gap-3">
      {title && (
        <div>
          <h2 className="text-xs font-medium uppercase tracking-wider text-faint">{title}</h2>
          {hint && <p className="mt-1 text-xs text-faint">{hint}</p>}
        </div>
      )}
      <div
        className={cn('flex flex-col gap-4 rounded-lg border border-line bg-panel p-4', className)}
      >
        {children}
      </div>
    </section>
  )
}

type BadgeTone = 'neutral' | 'success' | 'warning'

const badgeTones: Record<BadgeTone, string> = {
  neutral: 'border-line text-muted',
  success: 'border-success/30 text-success',
  warning: 'border-warning/30 text-warning',
}

/** Small status label, like "Installed" or "No key". */
export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center rounded-full border px-2 text-[11px] font-medium',
        badgeTones[tone],
      )}
    >
      {children}
    </span>
  )
}
