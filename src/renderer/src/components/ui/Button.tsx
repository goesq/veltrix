import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variants: Record<Variant, string> = {
  primary: 'bg-fg text-app hover:bg-white',
  secondary: 'text-fg border border-line hover:border-line-strong hover:bg-raised',
  ghost: 'text-muted hover:text-fg hover:bg-raised',
  danger: 'text-danger hover:bg-danger/10',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  icon?: ReactNode
}

export function Button({ variant = 'secondary', icon, className, children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-8 items-center justify-center gap-2 rounded-md px-3 text-[13px] font-medium',
        'transition-colors disabled:pointer-events-none disabled:opacity-40',
        variants[variant],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  active?: boolean
}

export function IconButton({ label, active, className, children, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cn(
        'inline-flex size-7 items-center justify-center rounded-md text-muted transition-colors',
        'hover:bg-raised hover:text-fg disabled:pointer-events-none disabled:opacity-40',
        active && 'bg-raised text-fg',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
