import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface SwitchFieldProps {
  label: string
  hint?: ReactNode
  checked: boolean
  onChange(checked: boolean): void
}

/** A setting that is on or off: label and hint on the left, the switch on the right. */
export function SwitchField({ label, hint, checked, onChange }: SwitchFieldProps) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium text-muted">{label}</span>
        {hint && <span className="text-xs text-faint">{hint}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full border transition-colors',
          checked ? 'border-fg bg-fg' : 'border-line-strong bg-surface hover:border-muted',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-3.5 rounded-full transition-[left,background-color]',
            checked ? 'left-[18px] bg-app' : 'left-0.5 bg-muted',
          )}
        />
      </button>
    </div>
  )
}
