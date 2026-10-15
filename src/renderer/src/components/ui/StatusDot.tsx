import { cn } from '../../lib/cn'

interface StatusDotProps {
  className?: string
  pulse?: boolean
  size?: 'sm' | 'md'
}

/** Small colored circle; pass the color as a `bg-*` class. */
export function StatusDot({ className, pulse, size = 'sm' }: StatusDotProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 rounded-full',
        size === 'sm' ? 'size-1.5' : 'size-2',
        pulse && 'animate-pulse',
        className,
      )}
    />
  )
}
