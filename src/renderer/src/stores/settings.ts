import { create } from 'zustand'
import type { Settings, SettingsPatch } from '@shared/types'
import { api } from '../lib/api'

interface SettingsState {
  settings: Settings | null
  load(): Promise<void>
  update(patch: SettingsPatch): Promise<void>
  setApiKey(key: string | null): Promise<void>
}

export const useSettings = create<SettingsState>((set) => ({
  settings: null,
  load: async () => set({ settings: await api.settings.get() }),
  update: async (patch) => set({ settings: await api.settings.update(patch) }),
  setApiKey: async (key) => set({ settings: await api.settings.setApiKey(key) }),
}))
