// Domain types shared by the main process, preload bridge and renderer.

import type { AgentTool, LivePermission, PlannerEngine } from './ai'
import type { Locale } from './i18n'

export type { PlannerEngine } from './ai'

export type Platform = 'darwin' | 'win32' | 'linux'

// ── Terminals ────────────────────────────────────────────────────────────────

/** A shell the user can open a terminal with (PowerShell, cmd, zsh, a WSL distro, ...). */
export interface ShellProfile {
  id: string
  name: string
}

export interface ShellProfileList {
  profiles: ShellProfile[]
  defaultId: string
}

export interface TerminalCreateOptions {
  cwd?: string
  /** Shell profile to launch; the default profile when omitted. */
  profileId?: string
  cols: number
  rows: number
}

export interface TerminalInfo {
  id: string
  pid: number
  profile: ShellProfile
  cwd: string
}

/** A terminal as remembered between app runs. */
export interface SavedTerminal {
  profileId: string
  /** Last working directory reported by the shell. */
  cwd: string
  /** Only set when the user renamed the terminal. */
  title?: string
  /** Left out of the grid layout. */
  hidden?: boolean
}

export interface TerminalSession {
  terminals: SavedTerminal[]
  activeIndex: number
  layout: 'single' | 'grid'
}

export interface TerminalExit {
  id: string
  exitCode: number
}

// ── Agents ───────────────────────────────────────────────────────────────────

export type AgentProvider = AgentTool | 'custom'

export interface Agent {
  id: string
  name: string
  /** Free-text role the orchestrator uses when routing tasks (e.g. "Backend / API"). */
  role: string
  provider: AgentProvider
  /** Only for the `custom` provider. `{prompt}` is replaced with the task instruction. */
  commandTemplate?: string
  /**
   * Context file of this agent when the project keeps one context per agent: a path
   * relative to the project folder, or absolute. Missing means `.veltrix/agents/<id>.md`.
   */
  contextFile?: string
  /** Permissions of this agent's live session on the canvas; missing means `ask`. */
  livePermission?: LivePermission
  /** Its live session may recruit and dismiss agents on the canvas (a team lead). */
  manager?: boolean
  /** The manager agent that recruited this one, if any; only it may dismiss it. */
  recruitedBy?: string
  color: AgentColor
}

export const AGENT_COLORS = ['green', 'blue', 'orange', 'purple', 'pink', 'yellow'] as const
export type AgentColor = (typeof AGENT_COLORS)[number]

// ── Tasks ────────────────────────────────────────────────────────────────────

export type TaskStatus = 'pending' | 'running' | 'done' | 'failed' | 'blocked' | 'cancelled'

export interface Task {
  id: string
  projectId: string
  /** Id of the goal (orchestrator run) this task belongs to. */
  goalId: string
  title: string
  description: string
  agentId: string
  dependsOn: string[]
  status: TaskStatus
  /** Tail of the agent output, ANSI-stripped, once the task finishes. */
  result?: string
  createdAt: number
  startedAt?: number
  finishedAt?: number
}

export interface Goal {
  id: string
  prompt: string
  /** Planner's one-paragraph summary of the approach. */
  plan?: string
  /** Agents the orchestrator added to the project for this goal. */
  createdAgentIds?: string[]
  status: 'planning' | 'running' | 'done' | 'failed'
  error?: string
  createdAt: number
}

// ── Projects ─────────────────────────────────────────────────────────────────

export interface Project {
  id: string
  name: string
  path: string
  /** Shown beside the name in the sidebar, tinted with `color`. Missing means a folder. */
  icon?: ProjectIcon
  color?: AgentColor
  agents: Agent[]
  goals: Goal[]
  tasks: Task[]
  /** How agents get the project's context; missing means one Veltrix file for everyone. */
  context?: ProjectContext
  /** Layout of the live-agents canvas. */
  canvas?: ProjectCanvas
  createdAt: number
}

/**
 * Where the context agents read comes from. `shared`: one file for every agent (Veltrix's
 * own, the project's CLAUDE.md, or any file). `perAgent`: each agent has its own file.
 */
export type ProjectContext =
  | { scope: 'shared'; source: 'veltrix' | 'claudeMd' }
  | { scope: 'shared'; source: 'file'; file: string }
  | { scope: 'perAgent' }

export const DEFAULT_PROJECT_CONTEXT: ProjectContext = { scope: 'shared', source: 'veltrix' }

/** A context file opened in the editor. */
export interface ContextDocument {
  /** Relative to the project folder when inside it, else absolute. */
  path: string
  content: string
  /** False for a picked file that isn't there yet; saving creates it. */
  exists: boolean
}

export const PROJECT_ICONS = [
  'folder',
  'server',
  'globe',
  'smartphone',
  'database',
  'terminal',
  'bot',
  'shopping-cart',
  'book',
  'palette',
  'cloud',
  'chart',
  'lock',
  'gamepad',
  'flask',
  'rocket',
] as const
export type ProjectIcon = (typeof PROJECT_ICONS)[number]

// ── Canvas ───────────────────────────────────────────────────────────────────

/** An agent placed on the canvas (one node per agent). Sizes are in canvas units. */
export interface CanvasAgentNode {
  agentId: string
  x: number
  y: number
  width: number
  height: number
}

/** Colors a note can have; `plain` follows the app's panel color. */
export const NOTE_COLORS = ['plain', 'yellow', 'green', 'blue', 'pink', 'purple'] as const
export type NoteColor = (typeof NOTE_COLORS)[number]

/**
 * A markdown note on the canvas. Its content lives in `.veltrix/notes/<id>.md` inside the
 * project, so agents connected to it read and edit a plain file.
 */
export interface CanvasNoteNode {
  id: string
  x: number
  y: number
  width: number
  height: number
  color: NoteColor
  /** Set by the user; missing means the note is named after its first line. */
  title?: string
  /** Read-only, for people and agents alike. */
  locked?: boolean
}

/** A free-standing label on the canvas, to title areas or jot ideas down. */
export interface CanvasTextNode {
  id: string
  x: number
  y: number
  width: number
  height: number
  text: string
}

/**
 * A line between two nodes. Between agents it is one-way: the `from` agent may send
 * messages to the `to` agent. Between an agent and a note (either way) the agent may read
 * and edit the note; between notes it chains them, so an agent linked to one reaches all.
 */
export interface CanvasEdge {
  id: string
  from: string
  to: string
  /** Paused by the user or by the loop guard; messages are refused while paused. */
  paused?: boolean
}

/**
 * A web page on the canvas (a "portal"). Agents linked to it can open pages, read them,
 * click, type and take screenshots, through `veltrix-send --browser`.
 */
export interface CanvasPortalNode {
  id: string
  x: number
  y: number
  width: number
  height: number
  /** Last page shown (http, https or about:blank). */
  url: string
  /** Set by the user; missing means the page's own title. */
  title?: string
}

export interface ProjectCanvas {
  nodes: CanvasAgentNode[]
  /** Missing on canvases saved before notes existed. */
  notes?: CanvasNoteNode[]
  texts?: CanvasTextNode[]
  portals?: CanvasPortalNode[]
  edges: CanvasEdge[]
}

export const EMPTY_CANVAS: ProjectCanvas = { nodes: [], notes: [], texts: [], portals: [], edges: [] }

/** A note's content changed on disk (an agent edited it, or another view saved it). */
export interface NoteChange {
  projectId: string
  noteId: string
  content: string
}

/** A live agent session on the canvas. */
export interface LiveSessionInfo {
  projectId: string
  agentId: string
  status: 'running' | 'exited'
  exitCode?: number
}

export interface LiveSessionData {
  projectId: string
  agentId: string
  data: string
}

/** A message one live agent sent another (or tried to). */
export interface CanvasMessage {
  id: string
  projectId: string
  from: string
  to: string
  text: string
  at: number
  /** Why it wasn't delivered; missing when it was. */
  error?: string
}

export interface ProjectInput {
  name: string
  path: string
  icon?: ProjectIcon
  color?: AgentColor
}

export type AgentInput = Omit<Agent, 'id'>

// ── Settings ─────────────────────────────────────────────────────────────────

export interface Settings {
  plannerEngine: PlannerEngine
  /** Model per engine; missing or empty uses the engine's default (the CLI's own, for CLIs). */
  plannerModels: Partial<Record<PlannerEngine, string>>
  /** Endpoint overrides for local engines (Ollama, OpenAI-compatible servers). */
  plannerBaseUrls: Partial<Record<PlannerEngine, string>>
  /** Engines with a stored API key (the keys themselves never leave the main process). */
  apiKeys: PlannerEngine[]
  terminalFontSize: number
  /** Shell profile for new terminals; null means the platform default. */
  defaultShellProfileId: string | null
  /** Folder new terminals start in; null means the user's home folder. */
  defaultTerminalCwd: string | null
  /** Replace the shell's prompt with Veltrix's `➜ folder git:(branch)`. */
  terminalPrompt: boolean
  /** Print the Veltrix banner when a terminal starts. */
  terminalBanner: boolean
  /** Interface language (English by default); null follows the system language. */
  language: Locale | null
  /** Shortcut overrides by action id; `null` unbinds. Missing actions use their default. */
  keybindings: Record<string, string | null>
}

export type SettingsPatch = Partial<Omit<Settings, 'apiKeys'>>

// ── Events pushed from main to renderer ──────────────────────────────────────

export interface TaskOutputEvent {
  projectId: string
  taskId: string
  /** Identifies the run, so a retried task starts with a clean output. */
  runStartedAt: number
  data: string
}
