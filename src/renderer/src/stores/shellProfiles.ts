import { create } from 'zustand'
import type { ShellProfile } from '@shared/types'
import { api } from '../lib/api'

interface ShellProfileState {
  profiles: ShellProfile[]
  defaultId: string | null
  load(): Promise<void>
}

/** Shells installed on this machine, as detected by the main process. */
export const useShellProfiles = create<ShellProfileState>((set) => ({
  profiles: [],
  defaultId: null,
  load: async () => {
    const { profiles, defaultId } = await api.terminal.profiles()
    set({ profiles, defaultId })
  },
}))
