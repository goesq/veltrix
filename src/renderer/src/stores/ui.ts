import { create } from 'zustand'

export type View = 'terminals' | 'projects' | 'settings'

interface UiState {
  view: View
  selectedProjectId: string | null
  paletteOpen: boolean
  /** While true, global shortcuts are paused so a new one can be recorded. */
  recordingShortcut: boolean
  /** Icon-only sidebar. */
  sidebarCollapsed: boolean
  /** Whether the open terminals are listed under "Terminais" in the sidebar. */
  terminalListExpanded: boolean
  navigate(view: View): void
  openProject(projectId: string): void
  setPaletteOpen(open: boolean): void
  setRecordingShortcut(recording: boolean): void
  toggleSidebar(): void
  toggleTerminalList(): void
}

/** Layout preferences remembered on this machine (view state, not settings). */
interface UiPreferences {
  sidebarCollapsed: boolean
  terminalListExpanded: boolean
}

const PREFERENCES_KEY = 'veltrix.ui'
const defaults: UiPreferences = { sidebarCollapsed: false, terminalListExpanded: true }

function loadPreferences(): UiPreferences {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? '{}') }
  } catch {
    return defaults
  }
}

export const useUi = create<UiState>((set) => ({
  view: 'terminals',
  selectedProjectId: null,
  paletteOpen: false,
  recordingShortcut: false,
  ...loadPreferences(),
  navigate: (view) => set({ view }),
  openProject: (projectId) => set({ view: 'projects', selectedProjectId: projectId }),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  setRecordingShortcut: (recordingShortcut) => set({ recordingShortcut }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  toggleTerminalList: () => set((s) => ({ terminalListExpanded: !s.terminalListExpanded })),
}))

useUi.subscribe(({ sidebarCollapsed, terminalListExpanded }) => {
  try {
    localStorage.setItem(
      PREFERENCES_KEY,
      JSON.stringify({ sidebarCollapsed, terminalListExpanded } satisfies UiPreferences),
    )
  } catch {
    // Storage unavailable: preferences just won't persist.
  }
})
