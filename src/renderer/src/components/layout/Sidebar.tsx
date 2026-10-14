import { FolderKanban, PanelLeftClose, PanelLeftOpen, Plus, Settings } from 'lucide-react'
import { addProject } from '../../features/projects/addProject'
import { useShortcutLabel } from '../../keybindings/bindings'
import { cn } from '../../lib/cn'
import { useProjects } from '../../stores/projects'
import { useUi } from '../../stores/ui'
import { Logo, LogoSymbol } from '../brand/Logo'
import { IconButton } from '../ui/Button'
import { StatusDot } from '../ui/StatusDot'
import { NavItem } from './NavItem'
import { SidebarTerminals } from './SidebarTerminals'

export function Sidebar() {
  const { view, navigate, selectedProjectId, openProject, sidebarCollapsed, toggleSidebar } =
    useUi()
  const projects = useProjects((s) => s.projects)
  const toggleShortcut = useShortcutLabel('view.toggleSidebar')
  const toggleLabel = `${sidebarCollapsed ? 'Expandir' : 'Recolher'} barra lateral${
    toggleShortcut ? ` (${toggleShortcut})` : ''
  }`

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
          <LogoSymbol className="h-3.5 text-fg" />
        ) : (
          <Logo className="h-[18px] text-fg" />
        )}
        <IconButton label={toggleLabel} onClick={toggleSidebar}>
          {sidebarCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
        </IconButton>
      </div>

      <nav className={cn('flex flex-col gap-0.5', sidebarCollapsed ? 'items-center px-2' : 'px-3')}>
        <SidebarTerminals collapsed={sidebarCollapsed} />
        <NavItem
          collapsed={sidebarCollapsed}
          icon={<FolderKanban size={16} />}
          label="Projetos"
          active={view === 'projects'}
          onSelect={() => navigate('projects')}
        />
        <NavItem
          collapsed={sidebarCollapsed}
          icon={<Settings size={16} />}
          label="Configurações"
          active={view === 'settings'}
          onSelect={() => navigate('settings')}
        />
      </nav>

      {!sidebarCollapsed && (
        <div className="mt-6 flex items-center justify-between px-5 pb-2">
          <span className="text-xs font-medium text-faint">Projetos</span>
          <IconButton label="Adicionar projeto" onClick={() => void addProject()}>
            <Plus size={14} />
          </IconButton>
        </div>
      )}

      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pb-3',
          sidebarCollapsed ? 'mt-4 items-center px-2' : 'px-3',
        )}
      >
        {!sidebarCollapsed && projects.length === 0 && (
          <p className="px-2 py-1 text-xs text-faint">Nenhum projeto ainda.</p>
        )}
        {projects.map((project) => {
          const running = project.tasks.some((t) => t.status === 'running')
          const selected = view === 'projects' && selectedProjectId === project.id
          const tone = selected
            ? 'bg-raised text-fg'
            : 'text-muted hover:bg-raised/60 hover:text-fg'
          return sidebarCollapsed ? (
            <button
              key={project.id}
              type="button"
              title={project.name}
              aria-label={project.name}
              onClick={() => openProject(project.id)}
              className={cn(
                'flex size-9 items-center justify-center rounded-md text-xs font-medium uppercase transition-colors',
                tone,
              )}
            >
              {project.name.slice(0, 2)}
            </button>
          ) : (
            <button
              key={project.id}
              type="button"
              onClick={() => openProject(project.id)}
              title={project.path}
              className={cn(
                'flex h-8 items-center gap-2.5 rounded-md px-2.5 text-left transition-colors',
                tone,
              )}
            >
              <StatusDot className={running ? 'bg-fg' : 'bg-line-strong'} pulse={running} />
              <span className="truncate">{project.name}</span>
              {project.agents.length > 0 && (
                <span className="ml-auto text-[11px] text-faint">{project.agents.length}</span>
              )}
            </button>
          )
        })}
      </div>
    </aside>
  )
}
