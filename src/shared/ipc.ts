import type { PlannerCheck, PlannerEngine } from './ai'
import type {
  Agent,
  AgentInput,
  CanvasMessage,
  ContextDocument,
  LiveSessionData,
  LiveSessionInfo,
  Platform,
  Project,
  ProjectCanvas,
  ProjectContext,
  ProjectInput,
  Settings,
  SettingsPatch,
  ShellProfileList,
  TerminalSession,
  TaskOutputEvent,
  TerminalCreateOptions,
  TerminalExit,
  TerminalInfo,
} from './types'

/**
 * Single source of truth for every IPC channel.
 * `invoke` channels are request/response; `events` are pushed from main to renderer.
 */
export const IpcChannel = {
  terminalProfiles: 'terminal:profiles',
  terminalCreate: 'terminal:create',
  terminalWrite: 'terminal:write',
  terminalResize: 'terminal:resize',
  terminalKill: 'terminal:kill',
  terminalData: 'terminal:data',
  terminalExit: 'terminal:exit',
  sessionLoad: 'session:load',
  sessionSave: 'session:save',

  projectsList: 'projects:list',
  projectsCreate: 'projects:create',
  projectsUpdate: 'projects:update',
  projectsRemove: 'projects:remove',
  projectsSaveAgent: 'projects:save-agent',
  projectsRemoveAgent: 'projects:remove-agent',
  projectsReadContext: 'projects:read-context',
  projectsWriteContext: 'projects:write-context',
  projectsSetContext: 'projects:set-context',
  projectsPickContextFile: 'projects:pick-context-file',
  projectsChanged: 'projects:changed',

  orchestratorSubmit: 'orchestrator:submit',
  orchestratorCancelTask: 'orchestrator:cancel-task',
  orchestratorRetryTask: 'orchestrator:retry-task',
  orchestratorClearFinished: 'orchestrator:clear-finished',
  orchestratorTaskLog: 'orchestrator:task-log',
  orchestratorTaskOutput: 'orchestrator:task-output',

  settingsGet: 'settings:get',
  settingsUpdate: 'settings:update',
  settingsSetApiKey: 'settings:set-api-key',

  liveStart: 'live:start',
  liveStop: 'live:stop',
  liveWrite: 'live:write',
  liveResize: 'live:resize',
  liveBuffer: 'live:buffer',
  liveList: 'live:list',
  liveData: 'live:data',
  liveExit: 'live:exit',
  canvasSave: 'canvas:save',
  canvasSetEdgePaused: 'canvas:set-edge-paused',
  canvasMessages: 'canvas:messages',
  canvasMessage: 'canvas:message',

  aiInstalledTools: 'ai:installed-tools',
  aiCheckPlanner: 'ai:check-planner',

  dialogPickDirectory: 'dialog:pick-directory',
} as const

/** API exposed on `window.veltrix` by the preload script. */
export interface VeltrixApi {
  platform: Platform
  terminal: {
    profiles(): Promise<ShellProfileList>
    create(options: TerminalCreateOptions): Promise<TerminalInfo>
    write(id: string, data: string): void
    resize(id: string, cols: number, rows: number): void
    kill(id: string): Promise<void>
    onData(listener: (id: string, data: string) => void): Unsubscribe
    onExit(listener: (event: TerminalExit) => void): Unsubscribe
  }
  /** Open terminals restored on the next launch. */
  session: {
    load(): Promise<TerminalSession | null>
    save(session: TerminalSession): void
  }
  projects: {
    list(): Promise<Project[]>
    create(input: ProjectInput): Promise<Project>
    /** Renames the project or points it at another folder (not while tasks are running). */
    update(projectId: string, input: ProjectInput): Promise<Project>
    remove(projectId: string): Promise<void>
    saveAgent(projectId: string, agent: AgentInput & { id?: string }): Promise<Agent>
    removeAgent(projectId: string, agentId: string): Promise<void>
    /** A context file and its path; `agentId` picks an agent's own file in per-agent mode. */
    readContext(projectId: string, agentId?: string): Promise<ContextDocument>
    writeContext(projectId: string, content: string, agentId?: string): Promise<void>
    setContext(projectId: string, context: ProjectContext): Promise<Project>
    /** Asks for a file to use as context; resolves with its path as stored on the project. */
    pickContextFile(projectId: string): Promise<string | null>
    onChanged(listener: (project: Project) => void): Unsubscribe
  }
  orchestrator: {
    submit(projectId: string, prompt: string): Promise<void>
    cancelTask(projectId: string, taskId: string): Promise<void>
    retryTask(projectId: string, taskId: string): Promise<void>
    clearFinished(projectId: string): Promise<void>
    /** Full output captured so far for a task (used to hydrate a view mid-run). */
    taskLog(projectId: string, taskId: string): Promise<string>
    onTaskOutput(listener: (event: TaskOutputEvent) => void): Unsubscribe
  }
  settings: {
    get(): Promise<Settings>
    update(patch: SettingsPatch): Promise<Settings>
    /** Stores (or, with null, removes) the API key of an engine in the OS keychain. */
    setApiKey(engine: PlannerEngine, key: string | null): Promise<Settings>
  }
  /** Interactive agent sessions shown on a project's canvas. */
  live: {
    start(projectId: string, agentId: string, cols: number, rows: number): Promise<LiveSessionInfo>
    stop(projectId: string, agentId: string): Promise<void>
    write(projectId: string, agentId: string, data: string): void
    resize(projectId: string, agentId: string, cols: number, rows: number): void
    /** Output so far (bounded), to fill a terminal that mounts mid-session. */
    buffer(projectId: string, agentId: string): Promise<string>
    list(projectId: string): Promise<LiveSessionInfo[]>
    onData(listener: (event: LiveSessionData) => void): Unsubscribe
    onExit(listener: (info: LiveSessionInfo) => void): Unsubscribe
  }
  canvas: {
    save(projectId: string, canvas: ProjectCanvas): Promise<Project>
    setEdgePaused(projectId: string, edgeId: string, paused: boolean): Promise<void>
    /** Recent messages between the project's live agents, oldest first. */
    messages(projectId: string): Promise<CanvasMessage[]>
    onMessage(listener: (message: CanvasMessage) => void): Unsubscribe
  }
  ai: {
    /** Which known CLIs (by executable name) are on the user's PATH. */
    installedTools(): Promise<Record<string, boolean>>
    /** Reaches the engine with the current settings, without planning anything. */
    checkPlanner(engine: PlannerEngine): Promise<PlannerCheck>
  }
  dialog: {
    pickDirectory(): Promise<string | null>
  }
}

export type Unsubscribe = () => void
