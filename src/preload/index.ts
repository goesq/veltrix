import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IpcChannel, type Unsubscribe, type VeltrixApi } from '@shared/ipc'
import type { Platform } from '@shared/types'

/** Subscribes to a main→renderer event and returns a function that removes the listener. */
function subscribe<Args extends unknown[]>(
  channel: string,
  listener: (...args: Args) => void,
): Unsubscribe {
  const handler = (_event: IpcRendererEvent, ...args: unknown[]): void =>
    listener(...(args as Args))
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
    update: (projectId, input) => ipcRenderer.invoke(IpcChannel.projectsUpdate, projectId, input),
    remove: (projectId) => ipcRenderer.invoke(IpcChannel.projectsRemove, projectId),
    saveAgent: (projectId, agent) =>
      ipcRenderer.invoke(IpcChannel.projectsSaveAgent, projectId, agent),
    removeAgent: (projectId, agentId) =>
      ipcRenderer.invoke(IpcChannel.projectsRemoveAgent, projectId, agentId),
    readContext: (projectId, agentId) =>
      ipcRenderer.invoke(IpcChannel.projectsReadContext, projectId, agentId),
    writeContext: (projectId, content, agentId) =>
      ipcRenderer.invoke(IpcChannel.projectsWriteContext, projectId, content, agentId),
    setContext: (projectId, context) =>
      ipcRenderer.invoke(IpcChannel.projectsSetContext, projectId, context),
    pickContextFile: (projectId) =>
      ipcRenderer.invoke(IpcChannel.projectsPickContextFile, projectId),
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
    setApiKey: (engine, key) => ipcRenderer.invoke(IpcChannel.settingsSetApiKey, engine, key),
  },
  live: {
    start: (projectId, agentId, cols, rows) =>
      ipcRenderer.invoke(IpcChannel.liveStart, projectId, agentId, cols, rows),
    stop: (projectId, agentId) => ipcRenderer.invoke(IpcChannel.liveStop, projectId, agentId),
    write: (projectId, agentId, data) =>
      ipcRenderer.send(IpcChannel.liveWrite, projectId, agentId, data),
    resize: (projectId, agentId, cols, rows) =>
      ipcRenderer.send(IpcChannel.liveResize, projectId, agentId, cols, rows),
    buffer: (projectId, agentId) => ipcRenderer.invoke(IpcChannel.liveBuffer, projectId, agentId),
    list: (projectId) => ipcRenderer.invoke(IpcChannel.liveList, projectId),
    onData: (listener) => subscribe(IpcChannel.liveData, listener),
    onExit: (listener) => subscribe(IpcChannel.liveExit, listener),
    onStarted: (listener) => subscribe(IpcChannel.liveStarted, listener),
  },
  canvas: {
    save: (projectId, canvas) => ipcRenderer.invoke(IpcChannel.canvasSave, projectId, canvas),
    setEdgePaused: (projectId, edgeId, paused) =>
      ipcRenderer.invoke(IpcChannel.canvasSetEdgePaused, projectId, edgeId, paused),
    messages: (projectId) => ipcRenderer.invoke(IpcChannel.canvasMessages, projectId),
    onMessage: (listener) => subscribe(IpcChannel.canvasMessage, listener),
  },
  notes: {
    read: (projectId, noteId) => ipcRenderer.invoke(IpcChannel.notesRead, projectId, noteId),
    write: (projectId, noteId, content) =>
      ipcRenderer.invoke(IpcChannel.notesWrite, projectId, noteId, content),
    watch: (projectId) => ipcRenderer.invoke(IpcChannel.notesWatch, projectId),
    unwatch: (projectId) => ipcRenderer.invoke(IpcChannel.notesUnwatch, projectId),
    onChanged: (listener) => subscribe(IpcChannel.notesChanged, listener),
  },
  ai: {
    installedTools: () => ipcRenderer.invoke(IpcChannel.aiInstalledTools),
    checkPlanner: (engine) => ipcRenderer.invoke(IpcChannel.aiCheckPlanner, engine),
  },
  dialog: {
    pickDirectory: () => ipcRenderer.invoke(IpcChannel.dialogPickDirectory),
  },
}

contextBridge.exposeInMainWorld('veltrix', api)
