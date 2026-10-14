import type { ReactNode } from 'react'
import { ChevronRight, FolderKanban, Plus, Settings, SquareTerminal, X } from 'lucide-react'
import { MAX_TERMINALS } from '@shared/constants'
import { cn } from '../../lib/cn'
import { useProjects } from '../../stores/projects'
import { useTerminals } from '../../stores/terminals'
import { useUi, type View } from '../../stores/ui'
import { IconButton } from '../ui/Button'
import { Logo } from '../brand/Logo'
import { StatusDot } from '../ui/StatusDot'
import { tagDot } from '../../lib/colors'
import { addProject } from '../../features/projects/addProject'

export function Sidebar() {
  const { view, navigate, selectedProjectId, openProject } = useUi()
  const terminalCount = useTerminals((s) => s.tabs.length)
  const { terminalListExpanded, toggleTerminalList } = useUi()
  const projects = useProjects((s) => s.projects)

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-surface">
      <div className="px-5 py-4">
        <Logo className="h-[18px] text-fg" />
      </div>

      <nav className="flex flex-col gap-0.5 px-3">
        <NavItem
          icon={<SquareTerminal size={16} />}
          label="Terminais"
          view="terminals"
          current={view}
          onSelect={navigate}
          badge={terminalCount > 0 ? `${terminalCount}/${MAX_TERMINALS}` : undefined}
          expanded={terminalCount > 0 ? terminalListExpanded : undefined}
          onToggle={toggleTerminalList}
        />
        {terminalListExpanded && <TerminalList />}
        <NavItem
          icon={<FolderKanban size={16} />}
          label="Projetos"
          view="projects"
          current={view}
          onSelect={navigate}
        />
        <NavItem
          icon={<Settings size={16} />}
          label="Configurações"
          view="settings"
          current={view}
          onSelect={navigate}
        />
      </nav>

      <div className="mt-6 flex items-center justify-between px-5 pb-2">
        <span className="text-xs font-medium text-faint">Projetos</span>
        <IconButton label="Adicionar projeto" onClick={addProject}>
          <Plus size={14} />
        </IconButton>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-3">
        {projects.length === 0 && (
          <p className="px-2 py-1 text-xs text-faint">Nenhum projeto ainda.</p>
        )}
        {projects.map((project) => {
          const running = project.tasks.some((t) => t.status === 'running')
          const selected = view === 'projects' && selectedProjectId === project.id
          return (
            <button
              key={project.id}
              type="button"
              onClick={() => openProject(project.id)}
              title={project.path}
              className={cn(
                'flex h-8 items-center gap-2.5 rounded-md px-2.5 text-left transition-colors',
                selected ? 'bg-raised text-fg' : 'text-muted hover:bg-raised/60 hover:text-fg',
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

/** Open terminals as sub-items of "Terminais": click to focus, ✕ on hover to close. */
function TerminalList() {
  const { tabs, activeId, focus, close } = useTerminals()
  const { view, navigate } = useUi()
  if (tabs.length === 0) return null

  return (
    <ul className="flex flex-col gap-0.5 pb-1">
      {tabs.map((tab) => {
        const selected = view === 'terminals' && tab.id === activeId
        return (
          <li key={tab.id} className="group relative">
            <button
              type="button"
              onClick={() => {
                focus(tab.id)
                navigate('terminals')
              }}
              className={cn(
                'flex h-7 w-full items-center gap-2.5 rounded-md pl-9 pr-8 text-left text-[12.5px] transition-colors',
                selected ? 'text-fg' : 'text-muted hover:bg-raised/60 hover:text-fg',
              )}
            >
              <StatusDot className={tab.exitCode === undefined ? tagDot[tab.color] : 'bg-faint'} />
              <span className="truncate">{tab.title}</span>
            </button>
            <IconButton
              label="Fechar terminal"
              onClick={() => void close(tab.id)}
              className="absolute right-1 top-0.5 size-6 opacity-0 group-hover:opacity-100"
            >
              <X size={12} />
            </IconButton>
          </li>
        )
      })}
    </ul>
  )
}

interface NavItemProps {
  icon: ReactNode
  label: string
  view: View
  current: View
  badge?: string
  /** When defined, shows a chevron that collapses / expands the item's sub-list. */
  expanded?: boolean
  onToggle?(): void
  onSelect(view: View): void
}

function NavItem({ icon, label, view, current, badge, expanded, onToggle, onSelect }: NavItemProps) {
  const active = view === current
  return (
    <div
      className={cn(
        'group flex h-9 items-center rounded-md transition-colors',
        active ? 'bg-raised text-fg' : 'text-muted hover:bg-raised/60 hover:text-fg',
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(view)}
        className={cn(
          'flex h-full min-w-0 flex-1 items-center gap-3 pl-2.5 text-left',
          expanded === undefined && 'pr-2.5',
        )}
      >
        {icon}
        <span>{label}</span>
        {badge && <span className="ml-auto pr-1 font-mono text-[11px] text-faint">{badge}</span>}
      </button>
      {expanded !== undefined && (
        <IconButton
          label={expanded ? 'Recolher lista' : 'Expandir lista'}
          onClick={onToggle}
          className="mr-1 size-6"
        >
          <ChevronRight size={13} className={cn('transition-transform', expanded && 'rotate-90')} />
        </IconButton>
      )}
    </div>
  )
}
