import { PanelLeftClose, PanelLeftOpen, Settings } from 'lucide-react'
import { useT, withShortcut } from '../../i18n'
import { useShortcutLabel } from '../../keybindings/bindings'
import { cn } from '../../lib/cn'
import { useUi } from '../../stores/ui'
import { Logo, LogoSymbol } from '../brand/Logo'
import { IconButton } from '../ui/Button'
import { NavItem } from './NavItem'
import { SidebarProjects } from './SidebarProjects'
import { SidebarTerminals } from './SidebarTerminals'

/** Terminals and projects as two flat lists, settings pinned to the bottom. */
export function Sidebar() {
  const { view, navigate, sidebarCollapsed, toggleSidebar } = useUi()
  const toggleShortcut = useShortcutLabel('view.toggleSidebar')
  const t = useT()
  const toggleLabel = withShortcut(
    sidebarCollapsed ? t.sidebar.expand : t.sidebar.collapse,
    toggleShortcut,
  )

  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-150',
        sidebarCollapsed ? 'w-14' : 'w-60',
      )}
    >
      <div
        className={cn(
          'flex items-center py-3',
          sidebarCollapsed ? 'flex-col gap-2 px-2' : 'justify-between pl-5 pr-2',
        )}
      >
        {sidebarCollapsed ? (
          <LogoSymbol className="h-4 text-fg" />
        ) : (
          <Logo className="h-[22px] text-fg" />
        )}
        <IconButton label={toggleLabel} onClick={toggleSidebar}>
          {sidebarCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
        </IconButton>
      </div>

      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pb-3',
          sidebarCollapsed ? 'items-center px-2' : 'px-3',
        )}
      >
        <SidebarTerminals collapsed={sidebarCollapsed} />
        <SidebarProjects collapsed={sidebarCollapsed} />
      </div>

      <nav
        className={cn(
          'flex flex-col border-t border-line py-2',
          sidebarCollapsed ? 'items-center px-2' : 'px-3',
        )}
      >
        <NavItem
          collapsed={sidebarCollapsed}
          icon={<Settings size={16} />}
          label={t.sidebar.settings}
          active={view === 'settings'}
          onSelect={() => navigate('settings')}
        />
      </nav>
    </aside>
  )
}
