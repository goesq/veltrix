import type {
  Agent,
  AgentInput,
  Platform,
  Project,
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
    readContext(projectId: string): Promise<string>
    writeContext(projectId: string, content: string): Promise<void>
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
    setApiKey(key: string | null): Promise<Settings>
  }
  dialog: {
    pickDirectory(): Promise<string | null>
  }
}

export type Unsubscribe = () => void
