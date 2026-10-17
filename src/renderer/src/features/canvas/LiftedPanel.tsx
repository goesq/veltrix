import { canvasOf } from '@shared/canvas'
import type { Project } from '@shared/types'
import { cn } from '../../lib/cn'
import { useCanvasActions } from './canvasActions'
import { AgentCard } from './AgentNode'
import { NoteCard } from './NoteNode'
import { PortalCard } from './PortalNode'

/**
 * A node lifted off the canvas into a large panel, at full size and 100% zoom, where a
 * terminal is sharpest and a note is easiest to write in. Clicking outside puts it back.
 */
export function LiftedPanel({ project }: { project: Project }) {
  const { lifted, lift } = useCanvasActions()
  if (!lifted) return null

  const agent = project.agents.find((a) => a.id === lifted)
  const note = canvasOf(project).notes.find((n) => n.id === lifted)
  const portal = canvasOf(project).portals.find((p) => p.id === lifted)
  if (!agent && !note && !portal) return null

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 p-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) lift(null)
      }}
    >
      <div
        className={cn(
          'lift-in h-full max-h-[900px] w-full',
          // A terminal wants width; text reads best in a narrower column.
          agent || portal ? 'max-w-[1200px]' : 'max-w-3xl',
        )}
      >
        {agent && <AgentCard projectId={project.id} agent={agent} panel />}
        {note && <NoteCard projectId={project.id} note={note} panel />}
        {portal && <PortalCard projectId={project.id} portal={portal} panel />}
      </div>
    </div>
  )
}
