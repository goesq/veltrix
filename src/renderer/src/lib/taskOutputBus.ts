import { api } from './api'

type DataHandler = (data: string) => void

const HISTORY_LIMIT = 512 * 1024

/**
 * Live output of agent tasks. Output seen since the window loaded is kept in memory;
 * for older runs the view falls back to the log file the main process wrote.
 */
class TaskOutputBus {
  private readonly handlers = new Map<string, Set<DataHandler>>()
  private readonly history = new Map<string, string>()

  constructor() {
    api.orchestrator.onTaskOutput(({ taskId, runStartedAt, data }) => {
      const key = runKey(taskId, runStartedAt)
      this.history.set(key, ((this.history.get(key) ?? '') + data).slice(-HISTORY_LIMIT))
      this.handlers.get(key)?.forEach((handler) => handler(data))
    })
  }

  /** Attaches to one run of a task (a retry is a new run with a new start time). */
  attach(projectId: string, taskId: string, runStartedAt: number, handler: DataHandler): () => void {
    const key = runKey(taskId, runStartedAt)
    const handlers = this.handlers.get(key) ?? new Set()
    handlers.add(handler)
    this.handlers.set(key, handlers)

    const history = this.history.get(key)
    if (history) handler(history)
    else
      void api.orchestrator.taskLog(projectId, taskId).then((log) => {
        // If live output arrived meanwhile, the handler already has it; don't duplicate.
        if (log && !this.history.has(key)) handler(log)
      })

    return () => handlers.delete(handler)
  }
}

const runKey = (taskId: string, runStartedAt: number): string => `${taskId}:${runStartedAt}`

export const taskOutputBus = new TaskOutputBus()
