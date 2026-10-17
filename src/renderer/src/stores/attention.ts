import { create } from 'zustand'
import { api } from '../lib/api'
import { sessionKey } from '../lib/liveBus'

/**
 * Which live agents are waiting for the user: they printed something since the user last
 * typed to them, then went quiet. Agent CLIs keep redrawing (spinners, timers) while they
 * work, so silence after output means "your turn": a question, a permission, a result.
 */
interface AttentionState {
  /** By `projectId:agentId`. */
  waiting: Record<string, boolean>
  /** The user typed into a session: whatever it was waiting for, it has it now. */
  answered(projectId: string, agentId: string): void
}

/** Quiet this long after output counts as waiting. */
const QUIET_MS = 4000
/** Less output than this since the user's last input is just echo or a cursor blink. */
const MIN_OUTPUT_CHARS = 80

const output = new Map<string, number>()
const timers = new Map<string, ReturnType<typeof setTimeout>>()

export const useAttention = create<AttentionState>((set) => ({
  waiting: {},
  answered: (projectId, agentId) => {
    const key = sessionKey(projectId, agentId)
    output.set(key, 0)
    clearTimeout(timers.get(key))
    set((state) => (state.waiting[key] ? { waiting: { ...state.waiting, [key]: false } } : state))
  },
}))

function setWaiting(key: string, waiting: boolean): void {
  useAttention.setState((state) =>
    !!state.waiting[key] === waiting ? state : { waiting: { ...state.waiting, [key]: waiting } },
  )
}

api.live.onData(({ projectId, agentId, data }) => {
  const key = sessionKey(projectId, agentId)
  output.set(key, (output.get(key) ?? 0) + data.length)
  setWaiting(key, false)
  clearTimeout(timers.get(key))
  timers.set(
    key,
    setTimeout(() => {
      if ((output.get(key) ?? 0) >= MIN_OUTPUT_CHARS) setWaiting(key, true)
    }, QUIET_MS),
  )
})

api.live.onExit(({ projectId, agentId }) => {
  const key = sessionKey(projectId, agentId)
  clearTimeout(timers.get(key))
  output.delete(key)
  setWaiting(key, false)
})

/** How many live agents of a project are waiting for the user. */
export function useWaitingCount(projectId: string): number {
  return useAttention(
    (s) =>
      Object.entries(s.waiting).filter(([key, on]) => on && key.startsWith(`${projectId}:`)).length,
  )
}
