import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IpcChannel, type Unsubscribe, type VeltrixApi } from '@shared/ipc'
import type { Platform } from '@shared/types'

/** Subscribes to a main→renderer event and returns a function that removes the listener. */
function subscribe<Args extends unknown[]>(
  channel: string,
  listener: (...args: Args) => void,
): Unsubscribe {
  const handler = (_event: IpcRendererEvent, ...args: unknown[]): void => listener(...(args as Args))
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

const api: VeltrixApi = {
  platform: process.platform as Platform,
  terminal: {
    profiles: () => ipcRenderer.invoke(IpcChannel.terminalProfiles),
    create: (options) => ipcRenderer.invoke(IpcChannel.terminalCreate, options),
    write: (id, data) => ipcRenderer.send(IpcChannel.terminalWrite, id, data),
    resize: (id, cols, rows) => ipcRenderer.send(IpcChannel.terminalResize, id, cols, rows),
    kill: (id) => ipcRenderer.invoke(IpcChannel.terminalKill, id),
    onData: (listener) => subscribe(IpcChannel.terminalData, listener),
    onExit: (listener) => subscribe(IpcChannel.terminalExit, listener),
  },
  session: {
    load: () => ipcRenderer.invoke(IpcChannel.sessionLoad),
    save: (session) => ipcRenderer.send(IpcChannel.sessionSave, session),
  },
  projects: {
    list: () => ipcRenderer.invoke(IpcChannel.projectsList),
    create: (input) => ipcRenderer.invoke(IpcChannel.projectsCreate, input),
    remove: (projectId) => ipcRenderer.invoke(IpcChannel.projectsRemove, projectId),
    saveAgent: (projectId, agent) =>
      ipcRenderer.invoke(IpcChannel.projectsSaveAgent, projectId, agent),
    removeAgent: (projectId, agentId) =>
      ipcRenderer.invoke(IpcChannel.projectsRemoveAgent, projectId, agentId),
    readContext: (projectId) => ipcRenderer.invoke(IpcChannel.projectsReadContext, projectId),
    writeContext: (projectId, content) =>
      ipcRenderer.invoke(IpcChannel.projectsWriteContext, projectId, content),
    onChanged: (listener) => subscribe(IpcChannel.projectsChanged, listener),
  },
  orchestrator: {
    submit: (projectId, prompt) =>
      ipcRenderer.invoke(IpcChannel.orchestratorSubmit, projectId, prompt),
    cancelTask: (projectId, taskId) =>
      ipcRenderer.invoke(IpcChannel.orchestratorCancelTask, projectId, taskId),
    retryTask: (projectId, taskId) =>
      ipcRenderer.invoke(IpcChannel.orchestratorRetryTask, projectId, taskId),
    clearFinished: (projectId) =>
      ipcRenderer.invoke(IpcChannel.orchestratorClearFinished, projectId),
    taskLog: (projectId, taskId) =>
      ipcRenderer.invoke(IpcChannel.orchestratorTaskLog, projectId, taskId),
    onTaskOutput: (listener) => subscribe(IpcChannel.orchestratorTaskOutput, listener),
  },
  settings: {
    get: () => ipcRenderer.invoke(IpcChannel.settingsGet),
    update: (patch) => ipcRenderer.invoke(IpcChannel.settingsUpdate, patch),
    setApiKey: (key) => ipcRenderer.invoke(IpcChannel.settingsSetApiKey, key),
  },
  dialog: {
    pickDirectory: () => ipcRenderer.invoke(IpcChannel.dialogPickDirectory),
  },
}

contextBridge.exposeInMainWorld('veltrix', api)
