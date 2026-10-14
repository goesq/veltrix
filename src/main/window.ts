import { join } from 'node:path'
import { BrowserWindow, shell } from 'electron'

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
      : { titleBarOverlay: { color: BACKGROUND, symbolColor: '#9b9b9b', height: 48 } }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

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
