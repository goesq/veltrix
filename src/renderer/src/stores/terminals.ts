import { create } from 'zustand'
import { MAX_TERMINALS } from '@shared/constants'
import type { AgentColor } from '@shared/types'
import { api } from '../lib/api'
import { colorAt } from '../lib/colors'
import { terminalBus } from '../lib/terminalBus'
import { AutoTitle } from '../features/terminals/autoTitle'

export interface TerminalTab {
  /** Id of the pty session in the main process. */
  id: string
  title: string
  /** `shell`: the profile name; `auto`: taken from the first command; `manual`: set by the user. */
  titleSource: 'shell' | 'auto' | 'manual'
  color: AgentColor
  cwd: string
  exitCode?: number
}

export type TerminalLayout = 'single' | 'grid'

interface TerminalState {
  tabs: TerminalTab[]
  activeId: string | null
  layout: TerminalLayout
  /** Monotonic counter used to assign tab colors. */
  created: number
  error: string | null
  canOpen(): boolean
  open(options?: { cwd?: string; title?: string; profileId?: string }): Promise<void>
  close(id: string): Promise<void>
  focus(id: string): void
  focusRelative(offset: number): void
  rename(id: string, title: string): void
  /** Observes keyboard input to name the terminal after its first command. */
  trackInput(id: string, data: string): void
  setLayout(layout: TerminalLayout): void
  dismissError(): void
}

/** Per-terminal input trackers; plain state, never rendered. */
const autoTitles = new Map<string, AutoTitle>()

export const useTerminals = create<TerminalState>((set, get) => ({
  tabs: [],
  activeId: null,
  layout: 'single',
  created: 0,
  error: null,

  canOpen: () => get().tabs.length < MAX_TERMINALS,

  open: async ({ cwd, title, profileId } = {}) => {
    if (!get().canOpen()) {
      set({ error: `Limite de ${MAX_TERMINALS} terminais atingido.` })
      return
    }
    try {
      const info = await api.terminal.create({ cwd, profileId, cols: 80, rows: 24 })
      set((state) => {
        const index = state.created
        const tab: TerminalTab = {
          id: info.id,
          title: title ?? info.profile.name,
          titleSource: title ? 'manual' : 'shell',
          color: colorAt(index),
          cwd: info.cwd,
        }
        return { tabs: [...state.tabs, tab], activeId: tab.id, created: index + 1, error: null }
      })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error) })
    }
  },

  close: async (id) => {
    terminalBus.forget(id)
    autoTitles.delete(id)
    set((state) => {
      const index = state.tabs.findIndex((tab) => tab.id === id)
      const tabs = state.tabs.filter((tab) => tab.id !== id)
      const activeId =
        state.activeId === id ? (tabs[Math.min(index, tabs.length - 1)]?.id ?? null) : state.activeId
      return { tabs, activeId }
    })
    await api.terminal.kill(id)
  },

  focus: (id) => set({ activeId: id }),

  focusRelative: (offset) => {
    const { tabs, activeId } = get()
    if (tabs.length === 0) return
    const index = tabs.findIndex((tab) => tab.id === activeId)
    set({ activeId: tabs[(index + offset + tabs.length) % tabs.length].id })
  },

  rename: (id, title) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === id && title.trim() ? { ...tab, title, titleSource: 'manual' } : tab,
      ),
    })),

  trackInput: (id, data) => {
    const tab = get().tabs.find((t) => t.id === id)
    if (!tab || tab.titleSource === 'manual') return
    let tracker = autoTitles.get(id)
    if (!tracker) {
      tracker = new AutoTitle()
      autoTitles.set(id, tracker)
    }
    if (tracker.finished) return
    const title = tracker.feed(data)
    if (!title) return
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id && t.titleSource !== 'manual' ? { ...t, title, titleSource: 'auto' } : t,
      ),
    }))
  },

  setLayout: (layout) => set({ layout }),

  dismissError: () => set({ error: null }),
}))

// A shell that exits keeps its tab (so the output stays readable) but is marked as ended.
api.terminal.onExit(({ id, exitCode }) =>
  useTerminals.setState((state) => ({
    tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, exitCode } : tab)),
  })),
)
