// Catalog of the AI tools Veltrix knows: the planners the orchestrator can use and the CLIs
// agents run with. Product names stay the same in every language.

// ── Planners ─────────────────────────────────────────────────────────────────

/** A CLI the user already signed in to; planning runs on their own subscription. */
export interface CliPlannerSpec {
  kind: 'cli'
  name: string
  /** Executable looked up on PATH. */
  binary: string
}

/** A model reached over HTTP: a cloud API with a key, or a server on this machine. */
export interface ApiPlannerSpec {
  kind: 'cloud' | 'local'
  name: string
  defaultModel: string
  /**
   * OpenAI-compatible endpoint (`/chat/completions`). Absent for Anthropic, which goes
   * through its own SDK. Local engines let the user change it.
   */
  baseUrl?: string
  key: 'required' | 'optional' | 'none'
  keyPlaceholder?: string
  /** Where the user creates a key, shown as a hint. */
  keyUrl?: string
  /** Supports `response_format: { type: 'json_object' }`. */
  jsonMode?: boolean
}

export type PlannerSpec = CliPlannerSpec | ApiPlannerSpec

export const PLANNER_ENGINES = {
  'claude-cli': { kind: 'cli', name: 'Claude Code', binary: 'claude' },
  'codex-cli': { kind: 'cli', name: 'Codex CLI', binary: 'codex' },
  'gemini-cli': { kind: 'cli', name: 'Gemini CLI', binary: 'gemini' },

  'anthropic-api': {
    kind: 'cloud',
    name: 'Anthropic',
    defaultModel: 'claude-opus-5-5',
    key: 'required',
    keyPlaceholder: 'sk-ant-…',
    keyUrl: 'console.anthropic.com',
  },
  'openai-api': {
    kind: 'cloud',
    name: 'OpenAI',
    defaultModel: 'gpt-5',
    baseUrl: 'https://api.openai.com/v1',
    key: 'required',
    keyPlaceholder: 'sk-…',
    keyUrl: 'platform.openai.com',
    jsonMode: true,
  },
  'gemini-api': {
    kind: 'cloud',
    name: 'Google Gemini',
    defaultModel: 'gemini-2.5-pro',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    key: 'required',
    keyPlaceholder: 'AIza…',
    keyUrl: 'aistudio.google.com',
  },
  'openrouter-api': {
    kind: 'cloud',
    name: 'OpenRouter',
    defaultModel: 'openai/gpt-5',
    baseUrl: 'https://openrouter.ai/api/v1',
    key: 'required',
    keyPlaceholder: 'sk-or-…',
    keyUrl: 'openrouter.ai',
    jsonMode: true,
  },
  'deepseek-api': {
    kind: 'cloud',
    name: 'DeepSeek',
    defaultModel: 'deepseek-chat',
    baseUrl: 'https://api.deepseek.com/v1',
    key: 'required',
    keyPlaceholder: 'sk-…',
    keyUrl: 'platform.deepseek.com',
    jsonMode: true,
  },
  'mistral-api': {
    kind: 'cloud',
    name: 'Mistral',
    defaultModel: 'mistral-large-latest',
    baseUrl: 'https://api.mistral.ai/v1',
    key: 'required',
    keyUrl: 'console.mistral.ai',
    jsonMode: true,
  },
  'xai-api': {
    kind: 'cloud',
    name: 'xAI (Grok)',
    defaultModel: 'grok-4',
    baseUrl: 'https://api.x.ai/v1',
    key: 'required',
    keyPlaceholder: 'xai-…',
    keyUrl: 'console.x.ai',
    jsonMode: true,
  },
  'groq-api': {
    kind: 'cloud',
    name: 'Groq',
    defaultModel: 'llama-3.3-70b-versatile',
    baseUrl: 'https://api.groq.com/openai/v1',
    key: 'required',
    keyPlaceholder: 'gsk_…',
    keyUrl: 'console.groq.com',
    jsonMode: true,
  },

  ollama: {
    kind: 'local',
    name: 'Ollama',
    defaultModel: 'llama3.1',
    baseUrl: 'http://localhost:11434/v1',
    key: 'none',
    jsonMode: true,
  },
  'openai-compatible': {
    kind: 'local',
    name: 'OpenAI-compatible',
    defaultModel: '',
    baseUrl: 'http://localhost:1234/v1',
    key: 'optional',
  },
} as const satisfies Record<string, PlannerSpec>

export type PlannerEngine = keyof typeof PLANNER_ENGINES

export const PLANNER_ENGINE_IDS = Object.keys(PLANNER_ENGINES) as PlannerEngine[]

export function plannerSpec(engine: PlannerEngine): PlannerSpec {
  return PLANNER_ENGINES[engine]
}

export function isPlannerEngine(value: unknown): value is PlannerEngine {
  return typeof value === 'string' && Object.hasOwn(PLANNER_ENGINES, value)
}

/** Engines that can hold an API key. */
export function acceptsApiKey(engine: PlannerEngine): boolean {
  const spec = plannerSpec(engine)
  return spec.kind !== 'cli' && spec.key !== 'none'
}

// ── Agent tools ──────────────────────────────────────────────────────────────

export interface AgentToolSpec {
  name: string
  binary: string
  /**
   * Headless command line. `{prompt}` is replaced with the shell-quoted instruction.
   * Defaults are conservative: agents may edit files in the project, but nothing more.
   */
  command: string
  /**
   * Interactive session on the canvas, by permission mode. `{prompt}` receives the opening
   * instruction; without it, the instruction is pasted once the CLI has started.
   */
  live: Record<LivePermission, string>
}

/** How a live agent handles permissions: ask in its terminal, or accept file edits. */
export type LivePermission = 'ask' | 'acceptEdits'

export const AGENT_TOOLS = {
  claude: {
    name: 'Claude Code',
    binary: 'claude',
    command: 'claude -p {prompt} --permission-mode acceptEdits',
    live: {
      ask: 'claude {prompt}',
      acceptEdits: 'claude --permission-mode acceptEdits {prompt}',
    },
  },
  codex: {
    name: 'Codex CLI',
    binary: 'codex',
    command: 'codex exec --sandbox workspace-write {prompt}',
    live: {
      ask: 'codex {prompt}',
      acceptEdits: 'codex --full-auto {prompt}',
    },
  },
  gemini: {
    name: 'Gemini CLI',
    binary: 'gemini',
    command: 'gemini --approval-mode auto_edit -p {prompt}',
    live: {
      ask: 'gemini -i {prompt}',
      acceptEdits: 'gemini --approval-mode auto_edit -i {prompt}',
    },
  },
  cursor: {
    name: 'Cursor CLI',
    binary: 'cursor-agent',
    command: 'cursor-agent -p --force {prompt}',
    live: { ask: 'cursor-agent {prompt}', acceptEdits: 'cursor-agent --force {prompt}' },
  },
  copilot: {
    name: 'GitHub Copilot CLI',
    binary: 'copilot',
    command: 'copilot -p {prompt} --allow-tool write',
    live: { ask: 'copilot -i {prompt}', acceptEdits: 'copilot --allow-tool write -i {prompt}' },
  },
  qwen: {
    name: 'Qwen Code',
    binary: 'qwen',
    command: 'qwen --approval-mode auto-edit -p {prompt}',
    live: { ask: 'qwen -i {prompt}', acceptEdits: 'qwen --approval-mode auto-edit -i {prompt}' },
  },
  opencode: {
    name: 'OpenCode',
    binary: 'opencode',
    command: 'opencode run {prompt}',
    live: { ask: 'opencode', acceptEdits: 'opencode' },
  },
  aider: {
    name: 'Aider',
    binary: 'aider',
    command: 'aider --yes-always --no-auto-commits --message {prompt}',
    live: { ask: 'aider --no-auto-commits', acceptEdits: 'aider --no-auto-commits --yes-always' },
  },
} as const satisfies Record<string, AgentToolSpec>

export type AgentTool = keyof typeof AGENT_TOOLS

export const AGENT_TOOL_IDS = Object.keys(AGENT_TOOLS) as AgentTool[]

export const PROMPT_PLACEHOLDER = '{prompt}'

/** Every executable Veltrix may look for, to show which ones are installed. */
export const KNOWN_BINARIES = [
  ...new Set([
    ...Object.values(AGENT_TOOLS).map((tool) => tool.binary),
    ...Object.values(PLANNER_ENGINES).flatMap((spec) => (spec.kind === 'cli' ? [spec.binary] : [])),
  ]),
]

/** Result of checking that a planner can be reached. */
export type PlannerCheck = { ok: true; detail?: string } | { ok: false; error: string }
