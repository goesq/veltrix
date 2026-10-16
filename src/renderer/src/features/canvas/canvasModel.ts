import type { Edge, Node } from '@xyflow/react'
import {
  EMPTY_CANVAS,
  type Agent,
  type CanvasAgentNode,
  type CanvasEdge,
  type Project,
  type ProjectCanvas,
} from '@shared/types'

/** Data handed to each agent node component. */
export type AgentNodeData = { projectId: string; agent: Agent }
export type AgentFlowNode = Node<AgentNodeData, 'agent'>

export const NEW_NODE_SIZE = { width: 560, height: 360 }
export const MIN_NODE_SIZE = { width: 360, height: 220 }

export function canvasOf(project: Project): ProjectCanvas {
  return project.canvas ?? EMPTY_CANVAS
}

/** React Flow nodes for the agents placed on the project's canvas. */
export function toFlowNodes(project: Project): AgentFlowNode[] {
  return canvasOf(project).nodes.flatMap((node) => {
    const agent = project.agents.find((a) => a.id === node.agentId)
    if (!agent) return []
    return {
      id: node.agentId,
      type: 'agent' as const,
      position: { x: node.x, y: node.y },
      width: node.width,
      height: node.height,
      deletable: false,
      dragHandle: '.agent-node-handle',
      data: { projectId: project.id, agent },
    }
  })
}

export function toFlowEdges(project: Project, active: Set<string>): Edge[] {
  return canvasOf(project).edges.map((edge) => ({
    id: edge.id,
    source: edge.from,
    target: edge.to,
    animated: active.has(edge.id) && !edge.paused,
    className: edge.paused ? 'canvas-edge-paused' : undefined,
    markerEnd: { type: 'arrowclosed' as const },
  }))
}

/** The stored layout of the nodes as they are on screen now. */
export function layoutOf(nodes: AgentFlowNode[]): CanvasAgentNode[] {
  return nodes.map((node) => ({
    agentId: node.id,
    x: Math.round(node.position.x),
    y: Math.round(node.position.y),
    width: Math.round(node.width ?? node.measured?.width ?? NEW_NODE_SIZE.width),
    height: Math.round(node.height ?? node.measured?.height ?? NEW_NODE_SIZE.height),
  }))
}

export function withEdge(canvas: ProjectCanvas, edge: CanvasEdge): ProjectCanvas {
  const exists = canvas.edges.some((e) => e.from === edge.from && e.to === edge.to)
  return exists ? canvas : { ...canvas, edges: [...canvas.edges, edge] }
}

export function withoutEdges(canvas: ProjectCanvas, ids: Set<string>): ProjectCanvas {
  return { ...canvas, edges: canvas.edges.filter((edge) => !ids.has(edge.id)) }
}

/** Removes an agent's node and every line touching it (the agent stays in the project). */
export function withoutAgentNode(canvas: ProjectCanvas, agentId: string): ProjectCanvas {
  return {
    nodes: canvas.nodes.filter((node) => node.agentId !== agentId),
    edges: canvas.edges.filter((edge) => edge.from !== agentId && edge.to !== agentId),
  }
}

/** Places a new node to the right of everything already on the canvas. */
export function withAgentNode(canvas: ProjectCanvas, agentId: string): ProjectCanvas {
  const right = Math.max(0, ...canvas.nodes.map((node) => node.x + node.width))
  const node: CanvasAgentNode = {
    agentId,
    x: canvas.nodes.length ? right + 80 : 0,
    y: 0,
    ...NEW_NODE_SIZE,
  }
  return { ...canvas, nodes: [...canvas.nodes, node] }
}
