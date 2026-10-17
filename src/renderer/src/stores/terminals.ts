import { create } from 'zustand'
import { MAX_TERMINALS } from '@shared/constants'
import type { AgentColor, TerminalSession } from '@shared/types'
import { messages } from '../i18n'
import { api } from '../lib/api'
import { colorAt } from '../lib/colors'
import { shortPath } from '../lib/cwd'
import { terminalBus } from '../lib/terminalBus'
import { AutoTitle } from '../features/terminals/autoTitle'

export interface TerminalTab {
  /** Id of the pty session in the main process. */
  id: string
  profileId: string
  title: string
  /**
   * `shell`: the profile name; `auto`: the folder and the first command (`veltrix · npm run
   * dev`), following the folder as it changes; `manual`: set by the user.
   */
  titleSource: 'shell' | 'auto' | 'manual'
  /** First command typed in the terminal, for the `auto` title. */
  command?: string
  color: AgentColor
  /** Working directory, kept up to date by the shell integration (OSC 7). */
  cwd: string
  /** Set for a project's own terminal, shown in the project view instead of the terminal list. */
  projectId?: string
  exitCode?: number
  /** Left out of the grid layout (eye toggle); still open and listed in the sidebar. */
  hidden?: boolean
}

export type TerminalLayout = 'single' | 'grid'

interface OpenOptions {
  cwd?: string
  title?: string
  profileId?: string
  projectId?: string
  /** Defaults to true; restored terminals don't steal focus from the one that was active. */
  activate?: boolean
  hidden?: boolean
}

interface TerminalState {
  /** Every open terminal, including project terminals. All count toward the limit. */
  tabs: TerminalTab[]
  /** Active terminal of the Terminals view. */
  activeId: string | null
  layout: TerminalLayout
  /** Monotonic counter used to assign colors. */
  created: number
  error: string | null
  canOpen(): boolean
  open(options?: OpenOptions): Promise<TerminalTab | undefined>
  /** The project's terminal, created in the project folder the first time. */
  openForProject(projectId: string, cwd: string, title: string): Promise<TerminalTab | undefined>
  /** Reopens the terminals of the previous run, or one default terminal. */
  restore(): Promise<void>
  close(id: string): Promise<void>
  focus(id: string): void
  focusRelative(offset: number): void
  /** Shows or hides a terminal in the grid layout. The last one shown can't be hidden. */
  setHidden(id: string, hidden: boolean): void
  /** Trades the places of two terminals (grid position and sidebar order). */
  swap(id: string, otherId: string): void
  rename(id: string, title: string): void
  setCwd(id: string, cwd: string): void
  /** Observes keyboard input to name the terminal after its first command. */
  trackInput(id: string, data: string): void
  setLayout(layout: TerminalLayout): void
  dismissError(): void
}

/** Terminals listed in the sidebar and shown in the Terminals view. */
export const workspaceTabs = (tabs: TerminalTab[]): TerminalTab[] =>
  tabs.filter((tab) => !tab.projectId)

/** Workspace terminals shown in the grid layout (not hidden with the eye toggle). */
export const gridTabs = (tabs: TerminalTab[]): TerminalTab[] => tabs.filter((tab) => !tab.hidden)

/** Title of a terminal named after its first command: `Git/veltrix · npm run dev`. */
const autoTitle = (cwd: string, command: string): string => `${shortPath(cwd)} · ${command}`

/** Per-terminal input trackers; plain state, never rendered. */
const autoTitles = new Map<string, AutoTitle>()

export const useTerminals = create<TerminalState>((set, get) => ({
  tabs: [],
  activeId: null,
  layout: 'single',
  created: 0,
  error: null,

  canOpen: () => get().tabs.length < MAX_TERMINALS,

  open: async ({ cwd, title, profileId, projectId, activate = true, hidden } = {}) => {
    if (!get().canOpen()) {
      set({ error: messages().terminals.limitReached(MAX_TERMINALS) })
      return undefined
    }
    try {
      const info = await api.terminal.create({ cwd, profileId, cols: 80, rows: 24 })
      const tab: TerminalTab = {
        id: info.id,
        profileId: info.profile.id,
        title: title ?? info.profile.name,
        titleSource: title ? 'manual' : 'shell',
        color: colorAt(get().created),
        cwd: info.cwd,
        projectId,
        hidden: hidden || undefined,
      }
      set((state) => ({
        tabs: [...state.tabs, tab],
        activeId: activate && !projectId ? tab.id : state.activeId,
        created: state.created + 1,
        error: null,
      }))
      return tab
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error) })
      return undefined
    }
  },

  openForProject: async (projectId, cwd, title) => {
    const existing = get().tabs.find((tab) => tab.projectId === projectId)
    return existing ?? get().open({ projectId, cwd, title })
  },

  restore: async () => {
    const session = await api.session.load()
    if (!session || session.terminals.length === 0) {
      await get().open()
      return
    }
    const opened: (TerminalTab | undefined)[] = []
    for (const saved of session.terminals.slice(0, MAX_TERMINALS)) {
      opened.push(
        await get().open({
          profileId: saved.profileId,
          cwd: saved.cwd,
          title: saved.title,
          hidden: saved.hidden,
          activate: false,
        }),
      )
    }
    const active = opened[session.activeIndex] ?? opened.find(Boolean)
    set({ layout: session.layout, activeId: active?.id ?? null })
  },

  close: async (id) => {
    terminalBus.forget(id)
    autoTitles.delete(id)
    set((state) => {
      const visible = workspaceTabs(state.tabs)
      const index = visible.findIndex((tab) => tab.id === id)
      const remaining = visible.filter((tab) => tab.id !== id)
      const activeId =
        state.activeId === id
          ? (remaining[Math.min(index, remaining.length - 1)]?.id ?? null)
          : state.activeId
      return { tabs: state.tabs.filter((tab) => tab.id !== id), activeId }
    })
    await api.terminal.kill(id)
  },

  // Project terminals live in their project view; they never become the active workspace tab.
  focus: (id) => {
    if (get().tabs.some((tab) => tab.id === id && !tab.projectId)) set({ activeId: id })
  },

  focusRelative: (offset) => {
    const visible = workspaceTabs(get().tabs)
    // In the grid, cycle through the terminals on screen only.
    const cycle = get().layout === 'grid' ? gridTabs(visible) : visible
    if (cycle.length === 0) return
    const index = cycle.findIndex((tab) => tab.id === get().activeId)
    set({ activeId: cycle[(index + offset + cycle.length) % cycle.length].id })
  },

  setHidden: (id, hidden) =>
    set((state) => {
      const shown = gridTabs(workspaceTabs(state.tabs))
      if (hidden && shown.length <= 1 && shown[0]?.id === id) return {}
      const tabs = state.tabs.map((tab) =>
        tab.id === id ? { ...tab, hidden: hidden || undefined } : tab,
      )
      // Keep the focus on something that is still on screen.
      const activeId =
        hidden && state.activeId === id
          ? (gridTabs(workspaceTabs(tabs))[0]?.id ?? state.activeId)
          : state.activeId
      return { tabs, activeId }
    }),

  swap: (id, otherId) =>
    set((state) => {
      const a = state.tabs.findIndex((tab) => tab.id === id)
      const b = state.tabs.findIndex((tab) => tab.id === otherId)
      if (a === -1 || b === -1 || a === b) return {}
      const tabs = [...state.tabs]
      ;[tabs[a], tabs[b]] = [tabs[b], tabs[a]]
      return { tabs }
    }),

  rename: (id, title) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === id && title.trim() ? { ...tab, title, titleSource: 'manual' } : tab,
      ),
    })),

  setCwd: (id, cwd) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => {
        if (tab.id !== id || tab.cwd === cwd) return tab
        const title =
          tab.titleSource === 'auto' && tab.command ? autoTitle(cwd, tab.command) : tab.title
        return { ...tab, cwd, title }
      }),
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
    const command = tracker.feed(data)
    if (!command) return
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id && t.titleSource !== 'manual'
          ? { ...t, command, title: autoTitle(t.cwd, command), titleSource: 'auto' }
          : t,
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

/** What gets restored next launch: the workspace terminals (not project ones) and layout. */
function snapshot({ tabs, activeId, layout }: TerminalState): TerminalSession {
  const visible = workspaceTabs(tabs)
  return {
    terminals: visible.map((tab) => ({
      profileId: tab.profileId,
      cwd: tab.cwd,
      title: tab.titleSource === 'manual' ? tab.title : undefined,
      hidden: tab.hidden,
    })),
    activeIndex: Math.max(
      0,
      visible.findIndex((tab) => tab.id === activeId),
    ),
    layout,
  }
}

const SAVE_DELAY_MS = 500
let saveTimer: ReturnType<typeof setTimeout> | undefined
let lastSaved = ''

/** Saves the session shortly after anything relevant changes. */
export function persistTerminalSession(): void {
  useTerminals.subscribe((state) => {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      const session = snapshot(state)
      const serialized = JSON.stringify(session)
      if (serialized === lastSaved) return
      lastSaved = serialized
      api.session.save(session)
    }, SAVE_DELAY_MS)
  })
}
