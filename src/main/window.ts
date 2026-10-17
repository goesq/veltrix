import { join } from 'node:path'
import { BrowserWindow, shell } from 'electron'
import { isPortalUrl } from '@shared/canvas'

const BACKGROUND = '#181818'

/** App icon; packaged builds also embed it in the executable / bundle. */
export const APP_ICON = join(__dirname, '../../resources/icon.png')

export function createMainWindow(): BrowserWindow {
  const isMac = process.platform === 'darwin'

  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    show: false,
    backgroundColor: BACKGROUND,
    title: 'Veltrix',
    // macOS takes the icon from the app bundle (or the dock, see index.ts).
    ...(isMac ? {} : { icon: APP_ICON }),
    // Custom title bar: native traffic lights on macOS, native caption buttons on Windows.
    titleBarStyle: 'hidden',
    ...(isMac
      ? { trafficLightPosition: { x: 16, y: 18 } }
      : // The title bar is 48px including its 1px bottom border; stopping the caption buttons
        // above it lets the border run all the way to the window edge.
        { titleBarOverlay: { color: BACKGROUND, symbolColor: '#9b9b9b', height: 47 } }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Portals on the canvas are <webview>s; guardPortals locks each one down.
      webviewTag: true,
    },
  })
  guardPortals(window)

  window.once('ready-to-show', () => window.show())

  // Links (e.g. clicked in a terminal) open in the user's browser, never inside the app.
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  window.webContents.on('will-navigate', (event) => event.preventDefault())

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return window
}

/** Session partition shared by every portal, away from the app's own. */
export const PORTAL_PARTITION = 'persist:veltrix-portals'

/**
 * Every <webview> (portal) attaches with the same locked-down settings, whatever the page
 * asked for: no preload, no Node, isolated and sandboxed, in its own partition, and only on
 * web pages. Links that open a new window load in the same portal instead.
 */
function guardPortals(window: BrowserWindow): void {
  window.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    delete webPreferences.preload
    webPreferences.nodeIntegration = false
    webPreferences.contextIsolation = true
    webPreferences.sandbox = true
    params.partition = PORTAL_PARTITION
    if (!isPortalUrl(params.src)) event.preventDefault()
  })
  window.webContents.on('did-attach-webview', (_event, guest) => {
    guest.setWindowOpenHandler(({ url }) => {
      if (isPortalUrl(url)) void guest.loadURL(url)
      return { action: 'deny' }
    })
    guest.on('will-navigate', (event, url) => {
      if (!isPortalUrl(url)) event.preventDefault()
    })
  })
}
