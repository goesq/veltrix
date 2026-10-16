import { useRef, useState } from 'react'
import { Eraser, MoreHorizontal } from 'lucide-react'
import type { Project } from '@shared/types'
import { Button, IconButton } from '../../components/ui/Button'
import { Menu } from '../../components/ui/Menu'
import { ResizeHandle } from '../../components/ui/ResizeHandle'
import { useT } from '../../i18n'
import { api } from '../../lib/api'
import { cn } from '../../lib/cn'
import { loadSizes, resizePair, saveSizes } from '../../lib/layoutSizes'
import { CanvasView } from '../canvas/CanvasView'
import { AgentsPanel } from './AgentsPanel'
import { ContextEditor } from './ContextEditor'
import { GoalCard } from './GoalCard'
import { OrchestratorComposer } from './OrchestratorComposer'
import { ProjectGlyph } from './ProjectGlyph'
import { EditProjectDialog, RemoveProjectDialog } from './ProjectDialogs'
import { ProjectTerminal } from './ProjectTerminal'

type Tab = 'orchestrator' | 'agents' | 'context' | 'canvas'

/** Orchestrator side and terminal side, as relative weights; shared by every project. */
const SPLIT_ID = 'projects.split'
const DEFAULT_SPLIT = [54, 46]
/** Smallest either side can be dragged to. */
const MIN_SIDE_WIDTH = 300

/** The draggable split between the orchestrator and the terminal, remembered across projects. */
function useSplit() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [sizes, setSizes] = useState(() => loadSizes(SPLIT_ID, DEFAULT_SPLIT))
  const dragStart = useRef(sizes)
  const latest = useRef(sizes)
  latest.current = sizes

  const handle = {
    axis: 'x' as const,
    onDragStart: () => {
      dragStart.current = latest.current
    },
    onDrag: (delta: number) => {
      const width = containerRef.current?.clientWidth ?? 0
      setSizes(resizePair(dragStart.current, 0, delta, width, MIN_SIDE_WIDTH))
    },
    onDragEnd: () => saveSizes(SPLIT_ID, latest.current),
    onReset: () => {
      setSizes(DEFAULT_SPLIT)
      saveSizes(SPLIT_ID, DEFAULT_SPLIT)
    },
  }
  return { containerRef, sizes, handle }
}

/** Orchestrator, agents and shared context on the left; the project's terminal on the right. */
export function ProjectDetail({ project }: { project: Project }) {
  const [tab, setTab] = useState<Tab>('orchestrator')
  const [dialog, setDialog] = useState<'edit' | 'remove' | null>(null)
  const t = useT()
  const split = useSplit()
  const [leftSize, rightSize] = split.sizes

  const goals = [...project.goals].sort((a, b) => b.createdAt - a.createdAt)
  const hasFinished = goals.some((g) => g.status === 'done' || g.status === 'failed')
  const busy = project.tasks.some((t) => t.status === 'running')

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-4 border-b border-line px-6 py-3.5">
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-base font-semibold">
            <ProjectGlyph icon={project.icon} color={project.color} />
            <span className="truncate">{project.name}</span>
          </h1>
          <p className="selectable truncate font-mono text-xs text-faint">{project.path}</p>
        </div>
        <Menu
          align="right"
          items={[
            { id: 'edit', label: t.projects.edit, onSelect: () => setDialog('edit') },
            {
              id: 'remove',
              label: t.projects.remove,
              danger: true,
              onSelect: () => setDialog('remove'),
            },
          ]}
          trigger={({ open, toggle }) => (
            <IconButton label={t.projects.options} active={open} onClick={toggle}>
              <MoreHorizontal size={16} />
            </IconButton>
          )}
        />
      </header>
      <EditProjectDialog
        project={project}
        open={dialog === 'edit'}
        busy={busy}
        onClose={() => setDialog(null)}
      />
      <RemoveProjectDialog
        project={project}
        open={dialog === 'remove'}
        busy={busy}
        onClose={() => setDialog(null)}
      />

      <div className="flex items-center gap-1 border-b border-line px-6">
        <TabButton active={tab === 'orchestrator'} onClick={() => setTab('orchestrator')}>
          {t.projects.tabs.orchestrator}
        </TabButton>
        <TabButton active={tab === 'agents'} onClick={() => setTab('agents')}>
          {t.projects.tabs.agents(project.agents.length)}
        </TabButton>
        <TabButton active={tab === 'context'} onClick={() => setTab('context')}>
          {t.projects.tabs.context}
        </TabButton>
        <TabButton active={tab === 'canvas'} onClick={() => setTab('canvas')}>
          {t.projects.tabs.canvas}
        </TabButton>
        {tab === 'orchestrator' && hasFinished && (
          <Button
            variant="ghost"
            className="ml-auto h-7"
            icon={<Eraser size={14} />}
            onClick={() => void api.orchestrator.clearFinished(project.id)}
          >
            {t.projects.clearFinished}
          </Button>
        )}
      </div>

      {/* The canvas takes the whole width; the split stays mounted so the terminal keeps running. */}
      {tab === 'canvas' && (
        <div className="min-h-0 flex-1">
          <CanvasView project={project} />
        </div>
      )}
      <div
        ref={split.containerRef}
        className={cn('relative flex min-h-0 flex-1', tab === 'canvas' && 'hidden')}
      >
        <div className="flex min-w-[240px] flex-col" style={{ flex: `${leftSize} 1 0px` }}>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
            {tab === 'orchestrator' && (
              <>
                <OrchestratorComposer project={project} />
                {goals.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} project={project} />
                ))}
              </>
            )}
            {tab === 'agents' && <AgentsPanel project={project} />}
            {tab === 'context' && <ContextEditor project={project} />}
          </div>
        </div>

        <ResizeHandle
          {...split.handle}
          showLine
          className="inset-y-0 w-3"
          style={{ left: `calc(${(leftSize / (leftSize + rightSize)) * 100}% - 6px)` }}
        />

        <div className="flex min-w-[240px] flex-col bg-app" style={{ flex: `${rightSize} 1 0px` }}>
          <ProjectTerminal key={project.id} project={project} />
        </div>
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick(): void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        '-mb-px h-10 shrink-0 whitespace-nowrap border-b-2 px-3 transition-colors',
        active ? 'border-fg text-fg' : 'border-transparent text-muted hover:text-fg',
      )}
    >
      {children}
    </button>
  )
}
