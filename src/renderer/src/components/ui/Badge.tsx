import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type BadgeTone = 'neutral' | 'success' | 'warning'

const badgeTones: Record<BadgeTone, string> = {
  neutral: 'border-line text-muted',
  success: 'border-success/30 text-success',
  warning: 'border-warning/30 text-warning',
}

interface BadgeProps {
  tone?: BadgeTone
  /** Tooltip explaining the badge. */
  title?: string
  children: ReactNode
}

/** Small status label, like "Installed", "No key" or "Beta". */
export function Badge({ tone = 'neutral', title, children }: BadgeProps) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex h-5 shrink-0 items-center rounded-full border px-2 text-[11px] font-medium',
        badgeTones[tone],
      )}
    >
      {children}
    </span>
  )
}
