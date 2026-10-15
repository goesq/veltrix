import { useEffect } from 'react'
import { RotateCcw, SquareTerminal } from 'lucide-react'
import type { Project } from '@shared/types'
import { Button } from '../../components/ui/Button'
import { useT } from '../../i18n'
import { useTerminals } from '../../stores/terminals'
import { TerminalPane } from '../terminals/TerminalPane'

/**
 * The project's own terminal, opened in the project folder. It keeps running while the
 * user browses elsewhere and is there again when they come back to the project.
 */
export function ProjectTerminal({ project }: { project: Project }) {
  const tab = useTerminals((s) => s.tabs.find((t) => t.projectId === project.id))
  const { openForProject, close, error } = useTerminals()
  const t = useT()

  useEffect(() => {
    void openForProject(project.id, project.path, project.name)
  }, [openForProject, project.id, project.path, project.name])

  const restart = async (): Promise<void> => {
    if (tab) await close(tab.id)
    await openForProject(project.id, project.path, project.name)
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-2 p-3">
      <header className="flex h-7 items-center gap-2 px-1 text-xs text-muted">
        <SquareTerminal size={14} />
        <span className="truncate font-mono" title={tab?.cwd ?? project.path}>
          {tab?.cwd ?? project.path}
        </span>
        {tab?.exitCode !== undefined && (
          <Button
            variant="ghost"
            className="ml-auto h-6 px-2 text-xs"
            icon={<RotateCcw size={12} />}
            onClick={() => void restart()}
          >
            {t.projects.restartTerminal}
          </Button>
        )}
      </header>
      <div className="min-h-0 flex-1">
        {tab ? (
          <TerminalPane tab={tab} active={false} showHeader={false} />
        ) : (
          <p className="p-4 text-muted">{error ?? t.projects.openingTerminal}</p>
        )}
      </div>
    </section>
  )
}
