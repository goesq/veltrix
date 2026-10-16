import { FolderKanban, Plus } from 'lucide-react'
import { addProject } from '../../features/projects/addProject'
import { BetaBadge } from '../../features/projects/BetaBadge'
import { ProjectGlyph } from '../../features/projects/ProjectGlyph'
import { useT } from '../../i18n'
import { cn } from '../../lib/cn'
import { useProjects } from '../../stores/projects'
import { useUi } from '../../stores/ui'
import { IconButton } from '../ui/Button'
import { StatusDot } from '../ui/StatusDot'
import { SidebarSection } from './SidebarSection'

/** "Projetos" section: the heading opens the overview, each row opens a project. */
export function SidebarProjects({ collapsed }: { collapsed: boolean }) {
  const { view, selectedProjectId, openProject, showProjects } = useUi()
  const projects = useProjects((s) => s.projects)
  const t = useT()

  return (
    <SidebarSection
      label={t.projects.section}
      icon={<FolderKanban size={16} />}
      collapsed={collapsed}
      active={view === 'projects' && selectedProjectId === null}
      onSelect={showProjects}
      badge={<BetaBadge />}
      actions={
        <IconButton label={t.projects.add} className="size-6" onClick={() => void addProject()}>
          <Plus size={14} />
        </IconButton>
      }
    >
      {!collapsed && projects.length === 0 && (
        <p className="px-2.5 py-1 text-xs text-faint">{t.projects.none}</p>
      )}
      {projects.map((project) => {
        const running = project.tasks.some((t) => t.status === 'running')
        const selected = view === 'projects' && selectedProjectId === project.id
        const tone = selected ? 'bg-raised text-fg' : 'text-muted hover:bg-raised/60 hover:text-fg'
        return collapsed ? (
          <button
            key={project.id}
            type="button"
            title={project.name}
            aria-label={project.name}
            onClick={() => openProject(project.id)}
            className={cn(
              'relative flex size-9 items-center justify-center rounded-md transition-colors',
              tone,
            )}
          >
            <ProjectGlyph icon={project.icon} color={project.color} />
            {running && <StatusDot size="md" pulse className="absolute right-1 top-1 bg-fg" />}
          </button>
        ) : (
          <button
            key={project.id}
            type="button"
            onClick={() => openProject(project.id)}
            title={project.path}
            className={cn(
              'flex h-10 items-center gap-3 rounded-md pl-3 pr-2 text-left text-sm transition-colors',
              tone,
            )}
          >
            <ProjectGlyph icon={project.icon} color={project.color} />
            <span className="truncate">{project.name}</span>
            {running && <StatusDot size="md" pulse className="ml-auto bg-fg" />}
          </button>
        )
      })}
    </SidebarSection>
  )
}
