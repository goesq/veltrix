import { create } from 'zustand'
import { MAX_TERMINALS } from '@shared/constants'
import type { AgentColor, TerminalSession } from '@shared/types'
import { api } from '../lib/api'
import { colorAt } from '../lib/colors'
import { terminalBus } from '../lib/terminalBus'
import { AutoTitle } from '../features/terminals/autoTitle'

export interface TerminalTab {
  /** Id of the pty session in the main process. */
  id: string
  profileId: string
  title: string
  /** `shell`: the profile name; `auto`: taken from the first command; `manual`: set by the user. */
  titleSource: 'shell' | 'auto' | 'manual'
  color: AgentColor
  /** Working directory, kept up to date by the shell integration (OSC 7). */
  cwd: string
  /** Set for a project's own terminal, shown in the project view instead of the terminal list. */
  projectId?: string
  exitCode?: number
}

export type TerminalLayout = 'single' | 'grid'

interface OpenOptions {
  cwd?: string
  title?: string
  profileId?: string
  projectId?: string
  /** Defaults to true; restored terminals don't steal focus from the one that was active. */
  activate?: boolean
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

/** Per-terminal input trackers; plain state, never rendered. */
const autoTitles = new Map<string, AutoTitle>()

export const useTerminals = create<TerminalState>((set, get) => ({
  tabs: [],
  activeId: null,
  layout: 'single',
  created: 0,
  error: null,

  canOpen: () => get().tabs.length < MAX_TERMINALS,

  open: async ({ cwd, title, profileId, projectId, activate = true } = {}) => {
    if (!get().canOpen()) {
      set({ error: `Limite de ${MAX_TERMINALS} terminais atingido.` })
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
    if (visible.length === 0) return
    const index = visible.findIndex((tab) => tab.id === get().activeId)
    set({ activeId: visible[(index + offset + visible.length) % visible.length].id })
  },

  rename: (id, title) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === id && title.trim() ? { ...tab, title, titleSource: 'manual' } : tab,
      ),
    })),

  setCwd: (id, cwd) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === id && tab.cwd !== cwd ? { ...tab, cwd } : tab)),
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

/** What gets restored next launch: the workspace terminals (not project ones) and layout. */
function snapshot({ tabs, activeId, layout }: TerminalState): TerminalSession {
  const visible = workspaceTabs(tabs)
  return {
    terminals: visible.map((tab) => ({
      profileId: tab.profileId,
      cwd: tab.cwd,
      title: tab.titleSource === 'manual' ? tab.title : undefined,
    })),
    activeIndex: Math.max(0, visible.findIndex((tab) => tab.id === activeId)),
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
