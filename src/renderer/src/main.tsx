import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import '@xterm/xterm/css/xterm.css'
import './styles.css'
import { App } from './App'
import { useShellProfiles } from './stores/shellProfiles'
import { persistTerminalSession, useTerminals } from './stores/terminals'

// Reopen the previous terminals where they were (or one fresh terminal), then keep saving.
void useTerminals.getState().restore().then(persistTerminalSession)
void useShellProfiles.getState().load()

// xterm measures the character cell when a terminal is created, so the fonts must be ready
// before the first render (they ship with the app, so this takes milliseconds).
void Promise.all([
  document.fonts.load('13px "Inter Variable"'),
  document.fonts.load('13px "JetBrains Mono Variable"'),
]).finally(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  ),
)
