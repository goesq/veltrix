import { existsSync } from 'node:fs'
import { BrowserWindow, dialog, ipcMain, type OpenDialogOptions } from 'electron'
import { KNOWN_BINARIES, type PlannerCheck, type PlannerEngine } from '@shared/ai'
import { IpcChannel } from '@shared/ipc'
import type {
  AgentInput,
  ContextDocument,
  ProjectCanvas,
  ProjectContext,
  ProjectInput,
  SettingsPatch,
  TerminalCreateOptions,
  TerminalSession,
} from '@shared/types'
import { isOnPath } from '../infra/shell'
import { loadLoginShellPath } from '../infra/loginShellPath'
import type { LiveSessionService } from '../live/LiveSessionService'
import type { MessageLog } from '../live/MessageLog'
import type { Orchestrator } from '../orchestrator/Orchestrator'
import { createPlanner } from '../orchestrator/planning/createPlanner'
import type { ProjectRepository } from '../projects/ProjectRepository'
import { ProjectWorkspace } from '../projects/ProjectWorkspace'
import type { SettingsService } from '../settings/SettingsService'
import type { SessionStore } from '../terminal/SessionStore'
import type { ShellProfiles } from '../terminal/ShellProfiles'
import type { TerminalService } from '../terminal/TerminalService'

export interface Services {
  terminals: TerminalService
  shellProfiles: ShellProfiles
  session: SessionStore
  projects: ProjectRepository
  orchestrator: Orchestrator
  settings: SettingsService
  live: LiveSessionService
  messages: MessageLog
}

/** Wires renderer requests to the services. This layer only translates; it holds no logic. */
export function registerIpc({
  terminals,
  shellProfiles,
  session,
  projects,
  orchestrator,
  settings,
  live,
  messages,
}: Services): void {
  ipcMain.handle(IpcChannel.terminalProfiles, () => shellProfiles.list())
  ipcMain.handle(IpcChannel.terminalCreate, (_e, options: TerminalCreateOptions) =>
    terminals.create(options),
  )
  ipcMain.on(IpcChannel.terminalWrite, (_e, id: string, data: string) => terminals.write(id, data))
  ipcMain.on(IpcChannel.terminalResize, (_e, id: string, cols: number, rows: number) =>
    terminals.resize(id, cols, rows),
  )
  ipcMain.handle(IpcChannel.terminalKill, (_e, id: string) => terminals.kill(id))
  ipcMain.handle(IpcChannel.sessionLoad, () => session.load())
  ipcMain.on(IpcChannel.sessionSave, (_e, snapshot: TerminalSession) => session.save(snapshot))

  ipcMain.handle(IpcChannel.projectsList, () => projects.list())
  ipcMain.handle(IpcChannel.projectsCreate, async (_e, input: ProjectInput) => {
    const project = projects.create(input)
    await new ProjectWorkspace(project).ensure()
    return project
  })
  ipcMain.handle(IpcChannel.projectsUpdate, async (_e, projectId: string, input: ProjectInput) => {
    const project = projects.edit(projectId, input)
    await new ProjectWorkspace(project).ensure()
    return project
  })
  ipcMain.handle(IpcChannel.projectsRemove, (_e, projectId: string) => {
    live.stopProject(projectId)
    projects.remove(projectId)
  })
  ipcMain.handle(
    IpcChannel.projectsSaveAgent,
    (_e, projectId: string, agent: AgentInput & { id?: string }) =>
      projects.saveAgent(projectId, agent),
  )
  ipcMain.handle(IpcChannel.projectsRemoveAgent, (_e, projectId: string, agentId: string) => {
    live.stop(projectId, agentId)
    projects.removeAgent(projectId, agentId)
  })
  ipcMain.handle(
    IpcChannel.projectsReadContext,
    async (_e, projectId: string, agentId?: string): Promise<ContextDocument> => {
      const workspace = new ProjectWorkspace(projects.get(projectId))
      const file = workspace.contextFile(agentId)
      const content = await workspace.readContext(agentId)
      return { path: file.path, content, exists: existsSync(file.absolute) }
    },
  )
  ipcMain.handle(
    IpcChannel.projectsWriteContext,
    (_e, projectId: string, content: string, agentId?: string) =>
      new ProjectWorkspace(projects.get(projectId)).writeContext(content, agentId),
  )
  ipcMain.handle(IpcChannel.projectsSetContext, (_e, projectId: string, context: ProjectContext) =>
    projects.setContext(projectId, context),
  )
  ipcMain.handle(IpcChannel.projectsPickContextFile, async (event, projectId: string) => {
    const project = projects.get(projectId)
    const window = BrowserWindow.fromWebContents(event.sender)
    const options: OpenDialogOptions = {
      defaultPath: project.path,
      properties: ['openFile'],
      filters: [
        { name: 'Markdown', extensions: ['md', 'mdx', 'markdown', 'txt'] },
        { name: '*', extensions: ['*'] },
      ],
    }
    const result = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options)
    const file = result.canceled ? undefined : result.filePaths[0]
    return file ? new ProjectWorkspace(project).projectPath(file) : null
  })

  ipcMain.handle(IpcChannel.orchestratorSubmit, (_e, projectId: string, prompt: string) =>
    orchestrator.submit(projectId, prompt),
  )
  ipcMain.handle(IpcChannel.orchestratorCancelTask, (_e, projectId: string, taskId: string) =>
    orchestrator.cancelTask(projectId, taskId),
  )
  ipcMain.handle(IpcChannel.orchestratorRetryTask, (_e, projectId: string, taskId: string) =>
    orchestrator.retryTask(projectId, taskId),
  )
  ipcMain.handle(IpcChannel.orchestratorClearFinished, (_e, projectId: string) =>
    orchestrator.clearFinished(projectId),
  )
  ipcMain.handle(IpcChannel.orchestratorTaskLog, (_e, projectId: string, taskId: string) =>
    orchestrator.taskLog(projectId, taskId),
  )

  ipcMain.handle(
    IpcChannel.liveStart,
    (_e, projectId: string, agentId: string, cols: number, rows: number) => {
      const project = projects.get(projectId)
      const agent = project.agents.find((a) => a.id === agentId)
      if (!agent) throw new Error('This agent was removed from the project.')
      return live.start(project, agent, cols, rows)
    },
  )
  ipcMain.handle(IpcChannel.liveStop, (_e, projectId: string, agentId: string) =>
    live.stop(projectId, agentId),
  )
  ipcMain.on(IpcChannel.liveWrite, (_e, projectId: string, agentId: string, data: string) =>
    live.write(projectId, agentId, data),
  )
  ipcMain.on(
    IpcChannel.liveResize,
    (_e, projectId: string, agentId: string, cols: number, rows: number) =>
      live.resize(projectId, agentId, cols, rows),
  )
  ipcMain.handle(IpcChannel.liveBuffer, (_e, projectId: string, agentId: string) =>
    live.buffer(projectId, agentId),
  )
  ipcMain.handle(IpcChannel.liveList, (_e, projectId: string) => live.list(projectId))
  ipcMain.handle(IpcChannel.canvasSave, (_e, projectId: string, canvas: ProjectCanvas) =>
    projects.saveCanvas(projectId, canvas),
  )
  ipcMain.handle(
    IpcChannel.canvasSetEdgePaused,
    (_e, projectId: string, edgeId: string, paused: boolean) =>
      projects.setEdgePaused(projectId, edgeId, paused),
  )
  ipcMain.handle(IpcChannel.canvasMessages, (_e, projectId: string) => messages.list(projectId))

  ipcMain.handle(IpcChannel.settingsGet, () => settings.get())
  ipcMain.handle(IpcChannel.settingsUpdate, (_e, patch: SettingsPatch) => settings.update(patch))
  ipcMain.handle(IpcChannel.settingsSetApiKey, (_e, engine: PlannerEngine, key: string | null) =>
    settings.setApiKey(engine, key),
  )

  ipcMain.handle(IpcChannel.aiInstalledTools, async () => {
    await loadLoginShellPath()
    return Object.fromEntries(KNOWN_BINARIES.map((binary) => [binary, isOnPath(binary)]))
  })
  ipcMain.handle(
    IpcChannel.aiCheckPlanner,
    async (_e, engine: PlannerEngine): Promise<PlannerCheck> => {
      try {
        return { ok: true, detail: await createPlanner(settings, engine).check() }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) }
      }
    },
  )

  ipcMain.handle(IpcChannel.dialogPickDirectory, async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    const options: OpenDialogOptions = { properties: ['openDirectory', 'createDirectory'] }
    const result = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options)
    return result.canceled ? null : (result.filePaths[0] ?? null)
  })
}
