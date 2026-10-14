import type { Goal, Task, TaskStatus } from '@shared/types'

const FINISHED: ReadonlySet<TaskStatus> = new Set(['done', 'failed', 'blocked', 'cancelled'])

export const isFinished = (task: Task): boolean => FINISHED.has(task.status)

/** Pending tasks whose dependencies are all done, at most one per idle agent. */
export function readyTasks(tasks: Task[]): Task[] {
  const byId = new Map(tasks.map((task) => [task.id, task]))
  const busyAgents = new Set(tasks.filter((t) => t.status === 'running').map((t) => t.agentId))
  const ready: Task[] = []

  for (const task of tasks) {
    if (task.status !== 'pending' || busyAgents.has(task.agentId)) continue
    if (task.dependsOn.every((id) => byId.get(id)?.status === 'done')) {
      ready.push(task)
      busyAgents.add(task.agentId)
    }
  }
  return ready
}

/** Every task that depends on `taskId`, directly or transitively. */
export function dependentsOf(taskId: string, tasks: Task[]): Task[] {
  const result = new Map<string, Task>()
  const queue = [taskId]
  while (queue.length) {
    const current = queue.shift()!
    for (const task of tasks) {
      if (task.dependsOn.includes(current) && !result.has(task.id)) {
        result.set(task.id, task)
        queue.push(task.id)
      }
    }
  }
  return [...result.values()]
}

/** Derives a goal's status from its tasks (planning is handled by the orchestrator). */
export function goalStatus(goal: Goal, tasks: Task[]): Goal['status'] {
  if (goal.status === 'planning') return goal.status
  const own = tasks.filter((task) => task.goalId === goal.id)
  if (own.length === 0) return goal.status
  if (own.some((task) => !isFinished(task))) return 'running'
  return own.every((task) => task.status === 'done') ? 'done' : 'failed'
}
