import { LoaderCircle } from 'lucide-react'
import type { Goal, Project } from '@shared/types'
import { useT } from '../../i18n'
import { cn } from '../../lib/cn'
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
      {goal.plan && <p className="selectable text-muted">{goal.plan}</p>}
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
