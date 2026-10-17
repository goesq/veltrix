import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { app, BrowserWindow, nativeImage } from 'electron'
import { resolveLocale } from '@shared/i18n'
import { IpcChannel } from '@shared/ipc'
import { CanvasService } from './canvas/CanvasService'
import { PortalService } from './canvas/PortalService'
import { NoteWatcher } from './canvas/NoteWatcher'
import { loadLoginShellPath } from './infra/loginShellPath'
import { registerIpc } from './ipc/registerIpc'
import { LiveSessionService } from './live/LiveSessionService'
import { MessageLog } from './live/MessageLog'
import { MessageRouter } from './live/MessageRouter'
import { SendServer } from './live/SendServer'
import { TeamService } from './live/TeamService'
import { AgentRunner } from './orchestrator/agents/AgentRunner'
import { Orchestrator } from './orchestrator/Orchestrator'
import { createPlanner } from './orchestrator/planning/createPlanner'
import { ProjectRepository } from './projects/ProjectRepository'
import { WorktreeService } from './projects/WorktreeService'
import { SettingsService } from './settings/SettingsService'
import { runSmokeTest, SMOKE_TEST_FLAG } from './smokeTest'
import { SessionStore } from './terminal/SessionStore'
import { ShellLauncher } from './terminal/ShellLauncher'
import { ShellProfiles } from './terminal/ShellProfiles'
import { TerminalService } from './terminal/TerminalService'
import { enableDevToolsShortcut, installAppMenu } from './menu'
import { APP_ICON, createMainWindow } from './window'

let mainWindow: BrowserWindow | null = null
const smokeTest = process.argv.includes(SMOKE_TEST_FLAG)

/** Sends an event to the renderer, if the window is still alive. */
function send(channel: string, ...args: unknown[]): void {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, ...args)
}

function bootstrap(): void {
  // Started now so the user's PATH is ready by the time the first agent or planner runs.
  void loadLoginShellPath()
  const dataDir = app.getPath('userData')
  const settings = new SettingsService(join(dataDir, 'settings.json'))
  const projects = new ProjectRepository(join(dataDir, 'projects.json'))

  const shellProfiles = new ShellProfiles(() => settings.get().defaultShellProfileId)
  const launcher = new ShellLauncher(
    join(dataDir, 'shell-integration'),
    () => {
      const { defaultTerminalCwd, terminalPrompt, terminalBanner, language } = settings.get()
      return {
        defaultCwd: defaultTerminalCwd,
        prompt: terminalPrompt,
        banner: terminalBanner,
        locale: resolveLocale(language, app.getPreferredSystemLanguages()),
      }
    },
    app.getVersion(),
  )
  const session = new SessionStore(join(dataDir, 'session.json'))
  const terminals = new TerminalService(shellProfiles, launcher, {
    onData: (id, data) => send(IpcChannel.terminalData, id, data),
    onExit: (event) => send(IpcChannel.terminalExit, event),
  })

  const orchestrator = new Orchestrator(
    projects,
    new AgentRunner(),
    () => createPlanner(settings, settings.get().plannerEngine),
    {
      onTaskOutput: (event) => send(IpcChannel.orchestratorTaskOutput, event),
    },
  )
  orchestrator.recoverInterruptedWork()
  projects.onChange((project) => send(IpcChannel.projectsChanged, project))

  // Live agents on the canvas: their sessions, and the channel they message each other through.
  const messages = new MessageLog((message) => send(IpcChannel.canvasMessage, message))
  const sendServer = new SendServer(dataDir)
  const live = new LiveSessionService(sendServer, {
    onData: (projectId, agentId, data) => send(IpcChannel.liveData, { projectId, agentId, data }),
    onStart: (info) => send(IpcChannel.liveStarted, info),
    onExit: (info) => send(IpcChannel.liveExit, info),
  })
  const portals = new PortalService()
  const router = new MessageRouter(
    projects,
    live,
    messages,
    new TeamService(projects, live),
    portals,
  )
  sendServer
    .start((sender, request) => router.handle(sender, request))
    .catch((error: unknown) => {
      console.error('[live] Could not open the message channel for live agents.', error)
    })

  const canvas = new CanvasService(projects, live)
  const noteWatcher = new NoteWatcher(projects, (change) => send(IpcChannel.notesChanged, change))

  registerIpc({
    terminals,
    shellProfiles,
    session,
    projects,
    orchestrator,
    settings,
    live,
    messages,
    canvas,
    noteWatcher,
    portals,
    worktrees: new WorktreeService(
      projects,
      join(dataDir, 'worktrees'),
      (projectId, agentId) =>
        live.isRunning(projectId, agentId) ||
        projects.get(projectId).tasks.some((t) => t.agentId === agentId && t.status === 'running'),
    ),
  })

  installAppMenu()
  // In development there is no app bundle yet, so give the dock the real icon.
  if (process.platform === 'darwin' && !app.isPackaged) {
    app.dock?.setIcon(nativeImage.createFromPath(APP_ICON))
  }
  const openWindow = (): void => {
    mainWindow = createMainWindow()
    enableDevToolsShortcut(mainWindow)
    // Terminal tabs live in the window; agents keep running in the background (macOS).
    mainWindow.on('closed', () => {
      terminals.killAll()
      live.stopAll()
      noteWatcher.unwatchAll()
      mainWindow = null
    })
  }
  openWindow()
  if (smokeTest && mainWindow) {
    void runSmokeTest({
      window: mainWindow,
      profiles: shellProfiles,
      launcher,
      version: app.getVersion(),
    }).then((code) => app.exit(code))
  }
  app.on('activate', () => {
    if (!mainWindow) openWindow()
  })

  app.on('before-quit', () => {
    terminals.killAll()
    live.stopAll()
    sendServer.stop()
    noteWatcher.unwatchAll()
    orchestrator.shutdown()
  })
}

app.setName('Veltrix')
// A smoke test runs beside a normal instance, without reading or changing its data.
if (smokeTest) app.setPath('userData', mkdtempSync(join(tmpdir(), 'veltrix-smoke-')))

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  void app.whenReady().then(bootstrap)

  // macOS convention: closing the window keeps the app (and running agents) alive.
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
