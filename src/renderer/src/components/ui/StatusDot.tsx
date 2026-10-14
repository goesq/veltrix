import { cn } from '../../lib/cn'

interface StatusDotProps {
  className?: string
  pulse?: boolean
}

/** Small colored circle; pass the color as a `bg-*` class. */
export function StatusDot({ className, pulse }: StatusDotProps) {
  return (
    <span
      className={cn('inline-flex size-1.5 shrink-0 rounded-full', pulse && 'animate-pulse', className)}
    />
  )
}
