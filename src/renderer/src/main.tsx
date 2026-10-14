import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@xterm/xterm/css/xterm.css'
import './styles.css'
import { App } from './App'
import { useShellProfiles } from './stores/shellProfiles'
import { useTerminals } from './stores/terminals'

// Start with one terminal so the app is immediately useful.
void useTerminals.getState().open()
void useShellProfiles.getState().load()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
