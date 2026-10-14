import { create } from 'zustand'

export type View = 'terminals' | 'projects' | 'settings'

interface UiState {
  view: View
  selectedProjectId: string | null
  paletteOpen: boolean
  /** While true, global shortcuts are paused so a new one can be recorded. */
  recordingShortcut: boolean
  /** Whether the open terminals are listed under "Terminais" in the sidebar. */
  terminalListExpanded: boolean
  navigate(view: View): void
  openProject(projectId: string): void
  setPaletteOpen(open: boolean): void
  setRecordingShortcut(recording: boolean): void
  toggleTerminalList(): void
}

export const useUi = create<UiState>((set) => ({
  view: 'terminals',
  selectedProjectId: null,
  paletteOpen: false,
  recordingShortcut: false,
  terminalListExpanded: true,
  navigate: (view) => set({ view }),
  openProject: (projectId) => set({ view: 'projects', selectedProjectId: projectId }),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  setRecordingShortcut: (recordingShortcut) => set({ recordingShortcut }),
  toggleTerminalList: () => set((s) => ({ terminalListExpanded: !s.terminalListExpanded })),
}))
