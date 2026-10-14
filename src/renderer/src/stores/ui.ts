import { create } from 'zustand'

export type View = 'terminals' | 'projects' | 'settings'

interface UiState {
  view: View
  selectedProjectId: string | null
  paletteOpen: boolean
  /** While true, global shortcuts are paused so a new one can be recorded. */
  recordingShortcut: boolean
  navigate(view: View): void
  openProject(projectId: string): void
  setPaletteOpen(open: boolean): void
  setRecordingShortcut(recording: boolean): void
}

export const useUi = create<UiState>((set) => ({
  view: 'terminals',
  selectedProjectId: null,
  paletteOpen: false,
  recordingShortcut: false,
  navigate: (view) => set({ view }),
  openProject: (projectId) => set({ view: 'projects', selectedProjectId: projectId }),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  setRecordingShortcut: (recordingShortcut) => set({ recordingShortcut }),
}))
