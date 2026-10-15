import { BrowserWindow, dialog, ipcMain, type OpenDialogOptions } from 'electron'
import { IpcChannel } from '@shared/ipc'
import type {
  AgentInput,
  ProjectInput,
  SettingsPatch,
  TerminalCreateOptions,
  TerminalSession,
} from '@shared/types'
import type { Orchestrator } from '../orchestrator/Orchestrator'
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
}

/** Wires renderer requests to the services. This layer only translates; it holds no logic. */
export function registerIpc({
  terminals,
  shellProfiles,
  session,
  projects,
  orchestrator,
  settings,
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
  ipcMain.handle(IpcChannel.projectsRemove, (_e, projectId: string) => projects.remove(projectId))
  ipcMain.handle(
    IpcChannel.projectsSaveAgent,
    (_e, projectId: string, agent: AgentInput & { id?: string }) =>
      projects.saveAgent(projectId, agent),
  )
  ipcMain.handle(IpcChannel.projectsRemoveAgent, (_e, projectId: string, agentId: string) =>
    projects.removeAgent(projectId, agentId),
  )
  ipcMain.handle(IpcChannel.projectsReadContext, (_e, projectId: string) =>
    new ProjectWorkspace(projects.get(projectId)).readContext(),
  )
  ipcMain.handle(IpcChannel.projectsWriteContext, (_e, projectId: string, content: string) =>
    new ProjectWorkspace(projects.get(projectId)).writeContext(content),
  )

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

  ipcMain.handle(IpcChannel.settingsGet, () => settings.get())
  ipcMain.handle(IpcChannel.settingsUpdate, (_e, patch: SettingsPatch) => settings.update(patch))
  ipcMain.handle(IpcChannel.settingsSetApiKey, (_e, key: string | null) => settings.setApiKey(key))

  ipcMain.handle(IpcChannel.dialogPickDirectory, async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    const options: OpenDialogOptions = { properties: ['openDirectory', 'createDirectory'] }
    const result = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options)
    return result.canceled ? null : (result.filePaths[0] ?? null)
  })
}
