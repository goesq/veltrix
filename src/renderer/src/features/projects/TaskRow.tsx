import { useCallback, useEffect, useState } from 'react'
import { ChevronRight, RotateCcw, Square } from 'lucide-react'
import type { Agent, Task } from '@shared/types'
import { IconButton } from '../../components/ui/Button'
import { StatusDot } from '../../components/ui/StatusDot'
import { useT } from '../../i18n'
import { api } from '../../lib/api'
import { cn } from '../../lib/cn'
import { tagDot, tagText } from '../../lib/colors'
import { taskOutputBus } from '../../lib/taskOutputBus'
import { XTermView } from '../terminals/XTermView'
import { formatDuration, taskStatus } from './status'

interface TaskRowProps {
  task: Task
  agent?: Agent
  dependencies: Task[]
}

export function TaskRow({ task, agent, dependencies }: TaskRowProps) {
  const [expanded, setExpanded] = useState(task.status === 'running')
  const status = taskStatus[task.status]
  const canCancel = task.status === 'pending' || task.status === 'running'
  const canRetry = ['failed', 'cancelled', 'blocked'].includes(task.status)
  const elapsed = useElapsed(task)
  const t = useT()

  return (
    <li className="rounded-lg border border-line bg-surface">
      <div className="flex items-center gap-3 px-3 py-2">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <ChevronRight
            size={14}
            className={cn('shrink-0 text-faint transition-transform', expanded && 'rotate-90')}
          />
          <StatusDot className={status.dot} pulse={task.status === 'running'} />
          <span className="truncate">{task.title}</span>
        </button>

        {agent && (
          <span className={cn('flex shrink-0 items-center gap-1.5 text-xs', tagText[agent.color])}>
            <StatusDot className={tagDot[agent.color]} />
            {agent.name}
          </span>
        )}
        <span className={cn('w-20 shrink-0 text-right text-xs', status.text)}>
          {t.taskStatus[task.status]}
        </span>
        <span className="w-14 shrink-0 text-right font-mono text-[11px] text-faint">{elapsed}</span>
        <div className="flex w-7 shrink-0 justify-end">
          {canCancel && (
            <IconButton
              label={t.orchestrator.cancelTask}
              onClick={() => void api.orchestrator.cancelTask(task.projectId, task.id)}
            >
              <Square size={12} />
            </IconButton>
          )}
          {canRetry && (
            <IconButton
              label={t.orchestrator.retryTask}
              onClick={() => void api.orchestrator.retryTask(task.projectId, task.id)}
            >
              <RotateCcw size={13} />
            </IconButton>
          )}
        </div>
      </div>

      {expanded && (
        <div className="flex flex-col gap-3 border-t border-line px-4 py-3">
          <p className="selectable whitespace-pre-wrap text-muted">{task.description}</p>
          {dependencies.length > 0 && (
            <p className="text-xs text-faint">
              {t.orchestrator.dependsOn(dependencies.map((d) => d.title).join(', '))}
            </p>
          )}
          {task.startedAt && (
            <div className="h-72 overflow-hidden rounded-md border border-line bg-surface">
              {/* Keyed by run so a retry starts from a clean screen. */}
              <TaskOutput key={task.startedAt} task={task} runStartedAt={task.startedAt} />
            </div>
          )}
        </div>
      )}
    </li>
  )
}

function TaskOutput({ task, runStartedAt }: { task: Task; runStartedAt: number }) {
  const subscribe = useCallback(
    (write: (data: string) => void) =>
      taskOutputBus.attach(task.projectId, task.id, runStartedAt, write),
    [task.projectId, task.id, runStartedAt],
  )
  return <XTermView subscribe={subscribe} />
}

/** Live elapsed time for running tasks, final duration otherwise. */
function useElapsed(task: Task): string {
  const [, tick] = useState(0)
  useEffect(() => {
    if (task.status !== 'running') return
    const timer = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(timer)
  }, [task.status])
  return formatDuration(task.startedAt, task.finishedAt)
}
