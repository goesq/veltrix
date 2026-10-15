import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useT } from '../../i18n'
import { IconButton } from './Button'

interface DialogProps {
  title: string
  open: boolean
  onClose(): void
  children: ReactNode
  footer?: ReactNode
}

export function Dialog({ title, open, onClose, children, footer }: DialogProps) {
  const t = useT()
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-lg border border-line bg-panel"
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="text-sm font-semibold">{title}</h2>
          <IconButton label={t.common.close} onClick={onClose}>
            <X size={16} />
          </IconButton>
        </header>
        <div className="flex flex-col gap-4 px-5 py-4">{children}</div>
        {footer && (
          <footer className="flex justify-end gap-2 border-t border-line px-5 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}
