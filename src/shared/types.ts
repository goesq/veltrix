// Domain types shared by the main process, preload bridge and renderer.

import type { Locale } from './i18n'

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

export type AgentProvider = 'claude' | 'codex' | 'gemini' | 'custom'

export interface Agent {
  id: string
  name: string
  /** Free-text role the orchestrator uses when routing tasks (e.g. "Backend / API"). */
  role: string
  provider: AgentProvider
  /** Only for the `custom` provider. `{prompt}` is replaced with the task instruction. */
  commandTemplate?: string
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
  agents: Agent[]
  goals: Goal[]
  tasks: Task[]
  createdAt: number
}

export interface ProjectInput {
  name: string
  path: string
}

export type AgentInput = Omit<Agent, 'id'>

// ── Settings ─────────────────────────────────────────────────────────────────

export type PlannerEngine = 'claude-cli' | 'anthropic-api'

export interface Settings {
  plannerEngine: PlannerEngine
  /** Model used when plannerEngine is `anthropic-api`. */
  plannerModel: string
  /** Whether an API key is stored (the key itself never leaves the main process). */
  hasApiKey: boolean
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

export type SettingsPatch = Partial<Omit<Settings, 'hasApiKey'>>

// ── Events pushed from main to renderer ──────────────────────────────────────

export interface TaskOutputEvent {
  projectId: string
  taskId: string
  /** Identifies the run, so a retried task starts with a clean output. */
  runStartedAt: number
  data: string
}
