import { useState } from 'react'
import { Eraser, Trash2 } from 'lucide-react'
import type { Project } from '@shared/types'
import { Button } from '../../components/ui/Button'
import { api } from '../../lib/api'
import { cn } from '../../lib/cn'
import { useProjects } from '../../stores/projects'
import { useTerminals } from '../../stores/terminals'
import { AgentsPanel } from './AgentsPanel'
import { ContextEditor } from './ContextEditor'
import { GoalCard } from './GoalCard'
import { OrchestratorComposer } from './OrchestratorComposer'
import { ProjectTerminal } from './ProjectTerminal'

type Tab = 'orchestrator' | 'agents' | 'context'

/** Orchestrator, agents and shared context on the left; the project's terminal on the right. */
export function ProjectDetail({ project }: { project: Project }) {
  const [tab, setTab] = useState<Tab>('orchestrator')
  const removeProject = useProjects((s) => s.remove)
  const projectTerminal = useTerminals((s) => s.tabs.find((t) => t.projectId === project.id))
  const closeTerminal = useTerminals((s) => s.close)

  const goals = [...project.goals].sort((a, b) => b.createdAt - a.createdAt)
  const hasFinished = goals.some((g) => g.status === 'done' || g.status === 'failed')
  const busy = project.tasks.some((t) => t.status === 'running')

  const remove = async (): Promise<void> => {
    if (busy) return
    if (!window.confirm(`Remover "${project.name}" do Veltrix? Os arquivos não são apagados.`)) return
    if (projectTerminal) await closeTerminal(projectTerminal.id)
    await removeProject(project.id)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-4 border-b border-line px-6 py-3.5">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold">{project.name}</h1>
          <p className="selectable truncate font-mono text-xs text-faint">{project.path}</p>
        </div>
        <Button
          variant="danger"
          icon={<Trash2 size={15} />}
          disabled={busy}
          title={busy ? 'Aguarde as tarefas em execução terminarem' : 'Remover projeto'}
          onClick={() => void remove()}
        />
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-[380px] flex-1 flex-col border-r border-line">
          <div className="flex items-center gap-1 border-b border-line px-6">
            <TabButton active={tab === 'orchestrator'} onClick={() => setTab('orchestrator')}>
              Orquestrador
            </TabButton>
            <TabButton active={tab === 'agents'} onClick={() => setTab('agents')}>
              {`Agentes (${project.agents.length})`}
            </TabButton>
            <TabButton active={tab === 'context'} onClick={() => setTab('context')}>
              Contexto
            </TabButton>
            {tab === 'orchestrator' && hasFinished && (
              <Button
                variant="ghost"
                className="ml-auto h-7"
                icon={<Eraser size={14} />}
                onClick={() => void api.orchestrator.clearFinished(project.id)}
              >
                Limpar concluídos
              </Button>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
            {tab === 'orchestrator' && (
              <>
                <OrchestratorComposer project={project} />
                {goals.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} project={project} />
                ))}
              </>
            )}
            {tab === 'agents' && <AgentsPanel project={project} />}
            {tab === 'context' && <ContextEditor project={project} />}
          </div>
        </div>

        <div className="flex w-[46%] min-w-[360px] flex-col bg-app">
          <ProjectTerminal key={project.id} project={project} />
        </div>
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick(): void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        '-mb-px h-10 border-b-2 px-3 transition-colors',
        active ? 'border-fg text-fg' : 'border-transparent text-muted hover:text-fg',
      )}
    >
      {children}
    </button>
  )
}
