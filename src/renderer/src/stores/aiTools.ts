import { create } from 'zustand'
import { api } from '../lib/api'

interface AiToolsState {
  /** Whether each known CLI (by executable name) is on PATH; null until checked. */
  installed: Record<string, boolean> | null
  refresh(): Promise<void>
}

export const useAiTools = create<AiToolsState>((set) => ({
  installed: null,
  refresh: async () => set({ installed: await api.ai.installedTools() }),
}))
