import { FolderPlus } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { StatusDot } from '../../components/ui/StatusDot'
import { useProjects } from '../../stores/projects'
import { useUi } from '../../stores/ui'
import { ProjectDetail } from './ProjectDetail'
import { addProject } from './addProject'

export function ProjectsView() {
  const projects = useProjects((s) => s.projects)
  const { selectedProjectId, openProject } = useUi()
  const selected = projects.find((p) => p.id === selectedProjectId)

  if (selected) return <ProjectDetail project={selected} />

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={<FolderPlus size={20} />}
        title="Nenhum projeto"
        description="Um projeto é uma pasta onde agentes de IA trabalham juntos. Você envia o objetivo ao orquestrador, ele divide em tarefas e distribui entre os agentes, compartilhando o contexto."
        action={
          <Button variant="primary" onClick={() => void addProject()}>
            Adicionar projeto
          </Button>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-base font-semibold">Projetos</h1>
        <Button icon={<FolderPlus size={15} />} onClick={() => void addProject()}>
          Adicionar projeto
        </Button>
      </header>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
        {projects.map((project) => {
          const running = project.tasks.filter((t) => t.status === 'running').length
          return (
            <button
              key={project.id}
              type="button"
              onClick={() => openProject(project.id)}
              className="flex flex-col gap-2 rounded-lg border border-line bg-panel p-4 text-left transition-colors hover:border-line-strong"
            >
              <div className="flex items-center gap-2">
                <StatusDot className={running ? 'bg-fg' : 'bg-line-strong'} pulse={running > 0} />
                <span className="truncate font-medium">{project.name}</span>
              </div>
              <span className="truncate font-mono text-xs text-faint">{project.path}</span>
              <span className="text-xs text-muted">
                {project.agents.length} agente(s)
                {running > 0 && ` · ${running} tarefa(s) em execução`}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
