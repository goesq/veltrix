import { create } from 'zustand'
import type { CanvasMessage } from '@shared/types'
import { api } from '../lib/api'
import { liveBus, sessionKey } from '../lib/liveBus'

interface LiveState {
  /** Running live sessions, by `projectId:agentId`. */
  running: Record<string, boolean>
  /** Recent messages between live agents, by project, oldest first. */
  messages: Record<string, CanvasMessage[]>
  error: string | null
  load(projectId: string): Promise<void>
  start(projectId: string, agentId: string): Promise<void>
  stop(projectId: string, agentId: string): Promise<void>
  dismissError(): void
}

/** Initial size before the node's terminal measures itself and resizes the session. */
const START_COLS = 100
const START_ROWS = 30
/** Messages kept per project, like the main process. */
const MESSAGE_HISTORY = 200

export const useLive = create<LiveState>((set) => ({
  running: {},
  messages: {},
  error: null,

  load: async (projectId) => {
    const [sessions, messages] = await Promise.all([
      api.live.list(projectId),
      api.canvas.messages(projectId),
    ])
    set((state) => ({
      running: {
        ...state.running,
        ...Object.fromEntries(sessions.map((s) => [sessionKey(s.projectId, s.agentId), true])),
      },
      messages: { ...state.messages, [projectId]: messages },
    }))
  },

  start: async (projectId, agentId) => {
    try {
      liveBus.forget(projectId, agentId)
      await api.live.start(projectId, agentId, START_COLS, START_ROWS)
      set((state) => ({
        running: { ...state.running, [sessionKey(projectId, agentId)]: true },
        error: null,
      }))
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) })
    }
  },

  stop: (projectId, agentId) => api.live.stop(projectId, agentId),

  dismissError: () => set({ error: null }),
}))

// The main process is the source of truth for sessions and messages; mirror its events.
api.live.onExit(({ projectId, agentId }) =>
  useLive.setState((state) => ({
    running: { ...state.running, [sessionKey(projectId, agentId)]: false },
  })),
)
api.canvas.onMessage((message) =>
  useLive.setState((state) => ({
    messages: {
      ...state.messages,
      [message.projectId]: [...(state.messages[message.projectId] ?? []), message].slice(
        -MESSAGE_HISTORY,
      ),
    },
  })),
)
