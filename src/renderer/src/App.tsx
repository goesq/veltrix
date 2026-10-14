import { useEffect } from 'react'
import { Sidebar } from './components/layout/Sidebar'
import { TitleBar } from './components/layout/TitleBar'
import { CommandPalette } from './features/palette/CommandPalette'
import { ProjectsView } from './features/projects/ProjectsView'
import { SettingsView } from './features/settings/SettingsView'
import { Splash } from './features/splash/Splash'
import { TerminalsView } from './features/terminals/TerminalsView'
import { cn } from './lib/cn'
import { useProjects } from './stores/projects'
import { useSettings } from './stores/settings'
import { useUi } from './stores/ui'
import { useShortcuts } from './keybindings/useShortcuts'

export function App() {
  const view = useUi((s) => s.view)
  const loadProjects = useProjects((s) => s.load)
  const loadSettings = useSettings((s) => s.load)
  const settingsLoaded = useSettings((s) => s.settings !== null)

  useShortcuts()

  useEffect(() => {
    void loadProjects()
    void loadSettings()
  }, [loadProjects, loadSettings])

  return (
    <div className="flex h-full flex-col">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="relative min-w-0 flex-1 bg-app">
          {/* Terminals stay mounted while other views are shown, so shells keep running untouched. */}
          <div className={cn('h-full', view !== 'terminals' && 'hidden')}>
            {settingsLoaded && <TerminalsView />}
          </div>
          {view === 'projects' && <ProjectsView />}
          {view === 'settings' && <SettingsView />}
        </main>
      </div>
      <CommandPalette />
      <Splash />
    </div>
  )
}
