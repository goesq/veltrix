import { create } from 'zustand'

export type View = 'terminals' | 'projects' | 'settings'

export type SettingsSection =
  'general' | 'orchestrator' | 'apiKeys' | 'agents' | 'terminal' | 'shortcuts'

interface UiState {
  view: View
  selectedProjectId: string | null
  settingsSection: SettingsSection
  paletteOpen: boolean
  /** While true, global shortcuts are paused so a new one can be recorded. */
  recordingShortcut: boolean
  /** Icon-only sidebar. */
  sidebarCollapsed: boolean
  navigate(view: View): void
  openSettings(section: SettingsSection): void
  openProject(projectId: string): void
  /** The projects overview, with no project selected. */
  showProjects(): void
  setPaletteOpen(open: boolean): void
  setRecordingShortcut(recording: boolean): void
  toggleSidebar(): void
}

/** Layout preferences remembered on this machine (view state, not settings). */
interface UiPreferences {
  sidebarCollapsed: boolean
}

const PREFERENCES_KEY = 'veltrix.ui'
const defaults: UiPreferences = { sidebarCollapsed: false }

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
  settingsSection: 'general',
  paletteOpen: false,
  recordingShortcut: false,
  ...loadPreferences(),
  navigate: (view) => set({ view }),
  openSettings: (settingsSection) => set({ view: 'settings', settingsSection }),
  openProject: (projectId) => set({ view: 'projects', selectedProjectId: projectId }),
  showProjects: () => set({ view: 'projects', selectedProjectId: null }),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  // Skips no-op updates: the shortcut page sets this from an effect, on every render.
  setRecordingShortcut: (recordingShortcut) =>
    set((s) => (s.recordingShortcut === recordingShortcut ? s : { recordingShortcut })),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}))

useUi.subscribe(({ sidebarCollapsed }) => {
  try {
    localStorage.setItem(
      PREFERENCES_KEY,
      JSON.stringify({ sidebarCollapsed } satisfies UiPreferences),
    )
  } catch {
    // Storage unavailable: preferences just won't persist.
  }
})
