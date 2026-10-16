import { useCallback, useEffect, useMemo, useState } from 'react'
import { applyNodeChanges, type Connection, type Edge, type NodeChange } from '@xyflow/react'
import type { Project, ProjectCanvas } from '@shared/types'
import { api } from '../../lib/api'
import { useLive } from '../../stores/live'
import {
  canvasOf,
  layoutOf,
  toFlowEdges,
  toFlowNodes,
  withAgentNode,
  withEdge,
  withoutAgentNode,
  withoutEdges,
  type AgentFlowNode,
} from './canvasModel'

/** How long a line stays animated after a message went through it. */
const ACTIVE_EDGE_MS = 4000

/**
 * The canvas of a project as React Flow sees it. Nodes move locally while dragged and are
 * saved when a drag or resize ends; everything else is saved at once and comes back
 * through the project update.
 */
export function useCanvas(project: Project) {
  const canvas = canvasOf(project)
  const [nodes, setNodes] = useState<AgentFlowNode[]>(() => toFlowNodes(project))
  const activeEdges = useActiveEdges(project)

  // Re-sync only when the stored layout or the agents change, not on every project update
  // (task progress), so a drag in progress isn't reset.
  const syncKey = JSON.stringify([canvas.nodes, project.agents])
  useEffect(() => {
    setNodes((current) => {
      const selected = new Set(current.filter((n) => n.selected).map((n) => n.id))
      return toFlowNodes(project).map((n) => ({ ...n, selected: selected.has(n.id) }))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncKey])

  const save = useCallback(
    (next: ProjectCanvas) => void api.canvas.save(project.id, next),
    [project.id],
  )

  const onNodesChange = (changes: NodeChange<AgentFlowNode>[]): void => {
    const next = applyNodeChanges(changes, nodes)
    setNodes(next)
    const settled = changes.some(
      (c) =>
        (c.type === 'position' && c.dragging === false) ||
        (c.type === 'dimensions' && c.resizing === false),
    )
    if (settled) save({ ...canvas, nodes: layoutOf(next) })
  }

  const onConnect = ({ source, target }: Connection): void => {
    if (source === target) return
    save(withEdge(canvas, { id: crypto.randomUUID(), from: source, to: target }))
  }

  const onEdgesDelete = (deleted: Edge[]): void => {
    save(withoutEdges(canvas, new Set(deleted.map((e) => e.id))))
  }

  const onEdgeClick = (_event: unknown, edge: Edge): void => {
    const stored = canvas.edges.find((e) => e.id === edge.id)
    if (stored) void api.canvas.setEdgePaused(project.id, stored.id, !stored.paused)
  }

  const addAgent = (agentId: string): void => save(withAgentNode(canvas, agentId))

  const removeFromCanvas = (agentId: string): void => {
    void api.live.stop(project.id, agentId)
    save(withoutAgentNode(canvas, agentId))
  }

  const edges = useMemo(() => toFlowEdges(project, activeEdges), [project, activeEdges])
  const onCanvas = new Set(canvas.nodes.map((n) => n.agentId))
  const offCanvas = project.agents.filter((agent) => !onCanvas.has(agent.id))

  return {
    nodes,
    edges,
    offCanvas,
    onNodesChange,
    onConnect,
    onEdgesDelete,
    onEdgeClick,
    addAgent,
    removeFromCanvas,
  }
}

/** Ids of the lines a message went through in the last few seconds. */
function useActiveEdges(project: Project): Set<string> {
  const messages = useLive((s) => s.messages[project.id])
  const [now, setNow] = useState(() => Date.now())

  const recent = useMemo(
    () => (messages ?? []).filter((m) => !m.error && now - m.at < ACTIVE_EDGE_MS),
    [messages, now],
  )

  // Tick once the oldest active line should calm down, and whenever a new message arrives.
  useEffect(() => {
    setNow(Date.now())
  }, [messages])
  useEffect(() => {
    if (recent.length === 0) return
    const oldest = Math.min(...recent.map((m) => m.at))
    const timer = setTimeout(() => setNow(Date.now()), oldest + ACTIVE_EDGE_MS - Date.now() + 50)
    return () => clearTimeout(timer)
  }, [recent])

  return useMemo(() => {
    const edges = canvasOf(project).edges
    return new Set(
      recent.flatMap((m) =>
        edges.filter((e) => e.from === m.from && e.to === m.to).map((e) => e.id),
      ),
    )
  }, [project, recent])
}
