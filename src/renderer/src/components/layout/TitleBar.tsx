import { Search } from 'lucide-react'
import { isMac } from '../../lib/api'
import { cn } from '../../lib/cn'
import { useT } from '../../i18n'
import { useShortcutLabel } from '../../keybindings/bindings'
import { useUi } from '../../stores/ui'

/** Draggable window title bar with the command palette trigger in the middle. */
export function TitleBar() {
  const setPaletteOpen = useUi((s) => s.setPaletteOpen)
  const shortcut = useShortcutLabel('palette.toggle')
  const t = useT()

  return (
    <header
      className={cn(
        'drag flex h-12 shrink-0 items-center justify-center border-b border-line bg-app',
        // Leave room for the native window controls.
        isMac ? 'pl-20 pr-4' : 'pl-4 pr-36',
      )}
    >
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="no-drag flex h-8 w-full max-w-xl items-center gap-2 rounded-lg border border-line bg-surface px-3 text-muted transition-colors hover:border-line-strong hover:text-fg"
      >
        <Search size={14} />
        <span className="flex-1 text-left">{t.titleBar.search}</span>
        {shortcut && (
          <kbd className="rounded border border-line px-1.5 font-mono text-[11px] text-faint">
            {shortcut}
          </kbd>
        )}
      </button>
    </header>
  )
}
