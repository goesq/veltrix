import { api } from './api'

type DataHandler = (data: string) => void

/** Output kept per session, matching what the main process keeps. */
const HISTORY_LIMIT = 200_000

/**
 * Routes live agent output to the terminal of each canvas node. The first view of a session
 * starts from the main process's buffer, so a node that mounts mid-session (tab switch,
 * reload) shows everything so far.
 */
class LiveBus {
  private readonly handlers = new Map<string, Set<DataHandler>>()
  private readonly history = new Map<string, string>()
  /** Sessions whose buffer is being fetched; output arriving meanwhile is already in it. */
  private readonly loading = new Set<string>()

  constructor() {
    api.live.onData(({ projectId, agentId, data }) => {
      const key = sessionKey(projectId, agentId)
      if (this.loading.has(key)) return
      this.history.set(key, ((this.history.get(key) ?? '') + data).slice(-HISTORY_LIMIT))
      this.handlers.get(key)?.forEach((handler) => handler(data))
    })
  }

  attach(projectId: string, agentId: string, handler: DataHandler): () => void {
    const key = sessionKey(projectId, agentId)
    const handlers = this.handlers.get(key) ?? new Set()
    handlers.add(handler)
    this.handlers.set(key, handlers)

    const history = this.history.get(key)
    if (history !== undefined) handler(history)
    else void this.loadBuffer(projectId, agentId)

    return () => handlers.delete(handler)
  }

  /** Drops what a finished session printed, so a new run starts on a clean screen. */
  forget(projectId: string, agentId: string): void {
    this.history.delete(sessionKey(projectId, agentId))
  }

  private async loadBuffer(projectId: string, agentId: string): Promise<void> {
    const key = sessionKey(projectId, agentId)
    if (this.loading.has(key)) return
    this.loading.add(key)
    try {
      const buffer = await api.live.buffer(projectId, agentId)
      this.history.set(key, buffer)
      if (buffer) this.handlers.get(key)?.forEach((handler) => handler(buffer))
    } finally {
      this.loading.delete(key)
    }
  }
}

export const sessionKey = (projectId: string, agentId: string): string => `${projectId}:${agentId}`

export const liveBus = new LiveBus()
