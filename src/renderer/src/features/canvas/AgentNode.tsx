import { Handle, NodeResizer, Position, useReactFlow, type NodeProps } from '@xyflow/react'
import { Play, Square, X } from 'lucide-react'
import type { LivePermission } from '@shared/ai'
import { IconButton } from '../../components/ui/Button'
import { StatusDot } from '../../components/ui/StatusDot'
import { useT } from '../../i18n'
import { api } from '../../lib/api'
import { cn } from '../../lib/cn'
import { tagDot } from '../../lib/colors'
import { sessionKey } from '../../lib/liveBus'
import { useLive } from '../../stores/live'
import { providerLabel } from '../projects/providers'
import { useCanvasActions } from './canvasActions'
import { MIN_NODE_SIZE, type AgentFlowNode } from './canvasModel'
import { LiveTerminal } from './LiveTerminal'

/** A live agent on the canvas: its header, and its terminal while the session runs. */
export function AgentNode({
  data,
  selected,
  width,
  height,
  positionAbsoluteX,
  positionAbsoluteY,
}: NodeProps<AgentFlowNode>) {
  const { projectId, agent } = data
  const running = useLive((s) => s.running[sessionKey(projectId, agent.id)] ?? false)
  const start = useLive((s) => s.start)
  const stop = useLive((s) => s.stop)
  const { removeFromCanvas } = useCanvasActions()
  const { setCenter } = useReactFlow()
  const t = useT()

  /** Brings the node to 100% zoom, where the terminal is sharpest and the mouse lines up. */
  const focusNode = (): void => {
    void setCenter(positionAbsoluteX + (width ?? 0) / 2, positionAbsoluteY + (height ?? 0) / 2, {
      zoom: 1,
      duration: 250,
    })
  }

  const setPermission = (livePermission: LivePermission): void => {
    void api.projects.saveAgent(projectId, { ...agent, livePermission })
  }

  return (
    <>
      {/* Outside the clipped card, so the edges and corners can be grabbed to resize. */}
      <NodeResizer
        isVisible
        minWidth={MIN_NODE_SIZE.width}
        minHeight={MIN_NODE_SIZE.height}
        lineClassName="agent-resize-line"
        handleClassName="agent-resize-handle"
      />
      <Handle type="target" position={Position.Left} className="canvas-handle" />
      <Handle type="source" position={Position.Right} className="canvas-handle" />

      <div
        className={cn(
          'flex h-full w-full flex-col overflow-hidden rounded-lg border bg-panel shadow-lg',
          selected ? 'border-fg/50' : 'border-line',
        )}
      >
        <header
          className="agent-node-handle flex h-9 shrink-0 cursor-grab items-center gap-2 border-b border-line px-3 active:cursor-grabbing"
          onDoubleClick={focusNode}
          title={t.canvas.focusHint}
        >
          <StatusDot className={tagDot[agent.color]} pulse={running} size="md" />
          <span className="truncate font-medium">{agent.name}</span>
          <span className="truncate text-xs text-faint">{providerLabel(agent.provider, t)}</span>
          <div className="nodrag ml-auto flex items-center gap-1">
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
              label={t.canvas.removeFromCanvas}
              onClick={() => removeFromCanvas(agent.id)}
            >
              <X size={13} />
            </IconButton>
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
    </>
  )
}
