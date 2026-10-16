// Domain types shared by the main process, preload bridge and renderer.

import type { AgentTool, PlannerEngine } from './ai'
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
