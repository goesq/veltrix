import { useState } from 'react'
import { Bot, Pencil, Plus, Trash2 } from 'lucide-react'
import type { Agent, Project } from '@shared/types'
import { Button, IconButton } from '../../components/ui/Button'
import { StatusDot } from '../../components/ui/StatusDot'
import { api } from '../../lib/api'
import { tagDot } from '../../lib/colors'
import { AgentDialog } from './AgentDialog'
import { providers } from './providers'

interface AgentsPanelProps {
  project: Project
}

export function AgentsPanel({ project }: AgentsPanelProps) {
  const [dialog, setDialog] = useState<{ open: boolean; agent?: Agent }>({ open: false })

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wider text-faint">Agentes</h3>
        <IconButton label="Adicionar agente" onClick={() => setDialog({ open: true })}>
          <Plus size={15} />
        </IconButton>
      </header>

      {project.agents.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-line p-4">
          <p className="text-muted">
            Conecte agentes ao orquestrador. Cada um recebe um papel e executa as tarefas que o
            orquestrador distribuir.
          </p>
          <Button icon={<Bot size={15} />} onClick={() => setDialog({ open: true })}>
            Adicionar agente
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {project.agents.map((agent) => {
            const current = project.tasks.find(
              (t) => t.agentId === agent.id && t.status === 'running',
            )
            return (
              <li
                key={agent.id}
                className="group flex flex-col gap-1 rounded-lg border border-line bg-panel px-3 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <StatusDot className={tagDot[agent.color]} pulse={Boolean(current)} />
                  <span className="font-medium">{agent.name}</span>
                  <span className="text-xs text-faint">{providers[agent.provider].label}</span>
                  <div className="ml-auto flex opacity-0 transition-opacity group-hover:opacity-100">
                    <IconButton label="Editar" onClick={() => setDialog({ open: true, agent })}>
                      <Pencil size={13} />
                    </IconButton>
                    <IconButton
                      label="Remover"
                      onClick={() => void api.projects.removeAgent(project.id, agent.id)}
                    >
                      <Trash2 size={13} />
                    </IconButton>
                  </div>
                </div>
                {agent.role && <p className="line-clamp-2 text-xs text-muted">{agent.role}</p>}
                <p className="truncate text-xs text-faint">
                  {current ? `▸ ${current.title}` : 'Ocioso'}
                </p>
              </li>
            )
          })}
        </ul>
      )}

      <AgentDialog
        projectId={project.id}
        open={dialog.open}
        agent={dialog.agent}
        agentCount={project.agents.length}
        onClose={() => setDialog({ open: false })}
      />
    </section>
  )
}
