import { LoaderCircle } from 'lucide-react'
import type { Goal, Project } from '@shared/types'
import { useT } from '../../i18n'
import { StatusDot } from '../../components/ui/StatusDot'
import { cn } from '../../lib/cn'
import { tagDot, tagText } from '../../lib/colors'
import { goalStatus } from './status'
import { TaskRow } from './TaskRow'

interface GoalCardProps {
  goal: Goal
  project: Project
}

export function GoalCard({ goal, project }: GoalCardProps) {
  const tasks = project.tasks.filter((task) => task.goalId === goal.id)
  const done = tasks.filter((task) => task.status === 'done').length
  const status = goalStatus[goal.status]
  const created = (goal.createdAgentIds ?? []).flatMap((id) => {
    const agent = project.agents.find((a) => a.id === id)
    return agent ? [agent] : []
  })
  const t = useT()

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-line bg-panel p-4">
      <header className="flex items-start gap-3">
        <p className="selectable flex-1 whitespace-pre-wrap font-medium">{goal.prompt}</p>
        {tasks.length > 0 && (
          <span className="shrink-0 font-mono text-[11px] text-faint">
            {done}/{tasks.length}
          </span>
        )}
        <span className={cn('shrink-0 text-xs', status.text)}>{t.goalStatus[goal.status]}</span>
      </header>

      {goal.status === 'planning' && (
        <p className="flex items-center gap-2 text-muted">
          <LoaderCircle size={14} className="animate-spin" />
          {t.orchestrator.planningGoal}
        </p>
      )}
      {tasks.length > 0 && (
        <div className="h-1 overflow-hidden rounded-full bg-raised">
          <div
            className="h-full rounded-full bg-success transition-[width] duration-500"
            style={{ width: `${(done / tasks.length) * 100}%` }}
          />
        </div>
      )}
      {goal.plan && <p className="selectable text-muted">{goal.plan}</p>}
      {created.length > 0 && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span>{t.orchestrator.createdAgents}</span>
          {created.map((agent) => (
            <span key={agent.id} className={cn('flex items-center gap-1.5', tagText[agent.color])}>
              <StatusDot className={tagDot[agent.color]} />
              {agent.name}
            </span>
          ))}
        </p>
      )}
      {goal.error && <p className="selectable text-danger">{goal.error}</p>}

      {tasks.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              agent={project.agents.find((agent) => agent.id === task.agentId)}
              dependencies={project.tasks.filter((t) => task.dependsOn.includes(t.id))}
            />
          ))}
        </ul>
      )}
    </article>
  )
}
