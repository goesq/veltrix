import { join } from 'node:path'
import { app, BrowserWindow, nativeImage } from 'electron'
import { resolveLocale } from '@shared/i18n'
import { IpcChannel } from '@shared/ipc'
import { registerIpc } from './ipc/registerIpc'
import { AgentRunner } from './orchestrator/agents/AgentRunner'
import { Orchestrator } from './orchestrator/Orchestrator'
import { AnthropicApiPlanner } from './orchestrator/planning/AnthropicApiPlanner'
import { ClaudeCliPlanner } from './orchestrator/planning/ClaudeCliPlanner'
import type { Planner } from './orchestrator/planning/Planner'
import { ProjectRepository } from './projects/ProjectRepository'
import { SettingsService } from './settings/SettingsService'
import { SessionStore } from './terminal/SessionStore'
import { ShellLauncher } from './terminal/ShellLauncher'
import { ShellProfiles } from './terminal/ShellProfiles'
import { TerminalService } from './terminal/TerminalService'
import { enableDevToolsShortcut, installAppMenu } from './menu'
import { APP_ICON, createMainWindow } from './window'

let mainWindow: BrowserWindow | null = null

/** Sends an event to the renderer, if the window is still alive. */
function send(channel: string, ...args: unknown[]): void {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, ...args)
}

function bootstrap(): void {
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

  const createPlanner = (): Planner => {
    const { plannerEngine, plannerModel } = settings.get()
    if (plannerEngine === 'claude-cli') return new ClaudeCliPlanner()
    const apiKey = settings.apiKey()
    if (!apiKey) throw new Error('Add an Anthropic API key in Settings to use the API planner.')
    return new AnthropicApiPlanner(apiKey, plannerModel)
  }

  const orchestrator = new Orchestrator(projects, new AgentRunner(), createPlanner, {
    onTaskOutput: (event) => send(IpcChannel.orchestratorTaskOutput, event),
  })
  orchestrator.recoverInterruptedWork()
  projects.onChange((project) => send(IpcChannel.projectsChanged, project))

  registerIpc({ terminals, shellProfiles, session, projects, orchestrator, settings })

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
      mainWindow = null
    })
  }
  openWindow()
  app.on('activate', () => {
    if (!mainWindow) openWindow()
  })

  app.on('before-quit', () => {
    terminals.killAll()
    orchestrator.shutdown()
  })
}

app.setName('Veltrix')

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
