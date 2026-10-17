import { Handle, NodeResizer, Position, type NodeProps } from '@xyflow/react'
import { Crown, GitBranch, Maximize2, Minimize2, Play, Square, X } from 'lucide-react'
import type { LivePermission } from '@shared/ai'
import type { Agent } from '@shared/types'
import { IconButton } from '../../components/ui/Button'
import { StatusDot } from '../../components/ui/StatusDot'
import { useT } from '../../i18n'
import { api } from '../../lib/api'
import { cn } from '../../lib/cn'
import { tagDot } from '../../lib/colors'
import { sessionKey } from '../../lib/liveBus'
import { useAttention } from '../../stores/attention'
import { useLive } from '../../stores/live'
import { providerLabel } from '../projects/providers'
import { useCanvasActions } from './canvasActions'
import { MIN_SIZE, type AgentFlowNode } from './canvasModel'
import { LiftedPlaceholder } from './LiftedPlaceholder'
import { LiveTerminal } from './LiveTerminal'

/** A live agent on the canvas: its header, and its terminal while the session runs. */
export function AgentNode({ id, data, selected }: NodeProps<AgentFlowNode>) {
  const { lifted } = useCanvasActions()
  return (
    <>
      {/* Outside the clipped card, so the edges and corners can be grabbed to resize. */}
      <NodeResizer
        isVisible
        minWidth={MIN_SIZE.agent.width}
        minHeight={MIN_SIZE.agent.height}
        lineClassName="canvas-resize-line"
        handleClassName="canvas-resize-handle"
      />
      <Handle type="target" position={Position.Left} className="canvas-handle" />
      <Handle type="source" position={Position.Right} className="canvas-handle" />
      {lifted === id ? (
        <LiftedPlaceholder selected={selected} />
      ) : (
        <AgentCard projectId={data.projectId} agent={data.agent} selected={selected} />
      )}
    </>
  )
}

interface AgentCardProps {
  projectId: string
  agent: Agent
  selected?: boolean
  /** Shown as a large panel over the canvas. */
  panel?: boolean
}

/** Header and terminal of a live agent, on the canvas or lifted into a panel. */
export function AgentCard({ projectId, agent, selected, panel }: AgentCardProps) {
  const running = useLive((s) => s.running[sessionKey(projectId, agent.id)] ?? false)
  const waiting = useAttention((s) => s.waiting[sessionKey(projectId, agent.id)] ?? false)
  const start = useLive((s) => s.start)
  const stop = useLive((s) => s.stop)
  const { remove, lift } = useCanvasActions()
  const t = useT()

  const setPermission = (livePermission: LivePermission): void => {
    void api.projects.saveAgent(projectId, { ...agent, livePermission })
  }
  // Read from the brief when the session starts, so it can only change while stopped.
  const toggleManager = (): void => {
    void api.projects.saveAgent(projectId, { ...agent, manager: !agent.manager })
  }

  return (
    <div
      className={cn(
        'flex h-full w-full flex-col overflow-hidden rounded-lg border bg-panel shadow-lg transition-colors',
        waiting ? 'border-tag-yellow/70' : 'border-line',
        selected && 'canvas-node-selected',
      )}
    >
      <header
        className="canvas-node-handle flex h-9 shrink-0 cursor-grab items-center gap-2 border-b border-line px-3 active:cursor-grabbing"
        onDoubleClick={() => lift(panel ? null : agent.id)}
        title={panel ? undefined : t.canvas.liftHint}
      >
        <StatusDot className={tagDot[agent.color]} pulse={running && !waiting} size="md" />
        <span className="truncate font-medium">{agent.name}</span>
        {agent.worktree && (
          <span
            title={`${t.agents.worktree}: ${agent.worktree.branch}`}
            className="flex shrink-0 items-center gap-1 rounded bg-raised px-1.5 py-0.5 font-mono text-[10px] text-muted"
          >
            <GitBranch size={10} />
            {agent.worktree.branch.replace(/^veltrix\//, '')}
          </span>
        )}
        {agent.manager && (
          <Crown size={13} className="shrink-0 text-tag-yellow" aria-label={t.canvas.manager} />
        )}
        {waiting ? (
          <span className="flex shrink-0 items-center gap-1.5 text-xs text-tag-yellow">
            <StatusDot className="bg-tag-yellow" pulse />
            {t.canvas.waiting}
          </span>
        ) : (
          <span className="truncate text-xs text-faint">
            {agent.role || providerLabel(agent.provider, t)}
          </span>
        )}
        <div
          className="nodrag ml-auto flex items-center gap-1"
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <IconButton
            label={
              running
                ? t.canvas.managerLocked
                : agent.manager
                  ? t.canvas.managerOff
                  : t.canvas.managerOn
            }
            active={agent.manager}
            disabled={running}
            onClick={toggleManager}
          >
            <Crown size={13} />
          </IconButton>
          <select
            value={agent.livePermission ?? 'ask'}
            disabled={running}
            title={running ? t.canvas.permissionLocked : t.canvas.permission}
            onChange={(e) => setPermission(e.target.value as LivePermission)}
            className="h-6 rounded border border-line bg-surface px-1.5 text-[11px] text-muted disabled:opacity-60"
          >
            <option value="ask">{t.canvas.permissionAsk}</option>
            <option value="acceptEdits">{t.canvas.permissionAcceptEdits}</option>
          </select>
          {running ? (
            <IconButton label={t.canvas.stop} onClick={() => void stop(projectId, agent.id)}>
              <Square size={13} />
            </IconButton>
          ) : (
            <IconButton label={t.canvas.start} onClick={() => void start(projectId, agent.id)}>
              <Play size={13} />
            </IconButton>
          )}
          <IconButton
            label={panel ? t.canvas.putBack : t.canvas.lift}
            onClick={() => lift(panel ? null : agent.id)}
          >
            {panel ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </IconButton>
          {!panel && (
            <IconButton label={t.canvas.removeFromCanvas} onClick={() => remove([agent.id])}>
              <X size={13} />
            </IconButton>
          )}
        </div>
      </header>

      <div className="nodrag nowheel nopan min-h-0 flex-1 bg-app p-2">
        {running ? (
          <LiveTerminal projectId={projectId} agentId={agent.id} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className="max-w-64 text-xs text-muted">{t.canvas.stopped}</p>
            <button
              type="button"
              onClick={() => void start(projectId, agent.id)}
              className="flex h-8 items-center gap-2 rounded-md border border-line px-3 text-xs hover:border-line-strong hover:bg-raised"
            >
              <Play size={13} />
              {t.canvas.start}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
