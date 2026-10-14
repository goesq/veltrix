import { app, BrowserWindow, Menu, type MenuItemConstructorOptions } from 'electron'

/**
 * Electron's default menu binds keys like Ctrl/⌘+R (reload) and ⌘W (close window), which
 * would steal them from the shell and from Veltrix's own configurable shortcuts.
 * Windows gets no menu at all; macOS keeps only the standard app and edit menus.
 */
export function installAppMenu(): void {
  if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null)
    return
  }

  const template: MenuItemConstructorOptions[] = [
    { role: 'appMenu' },
    // Needed for ⌘C / ⌘V / ⌘A in text fields on macOS.
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    { label: 'Window', submenu: [{ role: 'minimize' }, { role: 'zoom' }] },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

/** F12 toggles DevTools in development builds (there is no menu to open them from). */
export function enableDevToolsShortcut(window: BrowserWindow): void {
  if (app.isPackaged) return
  window.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F12') {
      window.webContents.toggleDevTools()
      event.preventDefault()
    }
  })
}
