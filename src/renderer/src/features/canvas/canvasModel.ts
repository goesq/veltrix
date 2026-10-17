import type { Edge, Node, XYPosition } from '@xyflow/react'
import { AGENT_NODE_SIZE, canvasOf } from '@shared/canvas'
import type {
  Agent,
  CanvasEdge,
  CanvasNoteNode,
  CanvasPortalNode,
  CanvasTextNode,
  Project,
  ProjectCanvas,
} from '@shared/types'

/** Data handed to each node component. */
export type AgentNodeData = { projectId: string; agent: Agent }
export type NoteNodeData = { projectId: string; note: CanvasNoteNode }
export type TextNodeData = { text: CanvasTextNode }
export type PortalNodeData = { projectId: string; portal: CanvasPortalNode }

export type AgentFlowNode = Node<AgentNodeData, 'agent'>
export type NoteFlowNode = Node<NoteNodeData, 'note'>
export type TextFlowNode = Node<TextNodeData, 'text'>
export type PortalFlowNode = Node<PortalNodeData, 'portal'>
export type CanvasFlowNode = AgentFlowNode | NoteFlowNode | TextFlowNode | PortalFlowNode

/** Nodes snap to this grid while dragged (canvas units). */
export const GRID = 20
export const NOTE_SIZE = { width: 320, height: 280 }
export const TEXT_SIZE = { width: 300, height: 60 }
export const PORTAL_SIZE = { width: 640, height: 460 }
export const MIN_SIZE = {
  agent: { width: 360, height: 220 },
  note: { width: 220, height: 140 },
  text: { width: 80, height: 40 },
  portal: { width: 360, height: 240 },
} as const

/** Any node of the canvas seen as a box: its id, place and size. */
type Box = { id: string; x: number; y: number; width: number; height: number }

/** Every node on the canvas as a box. */
function boxesOf(canvas: ProjectCanvas): Box[] {
  return [
    ...canvas.nodes.map((node) => ({ ...node, id: node.agentId })),
    ...(canvas.notes ?? []),
    ...(canvas.texts ?? []),
    ...(canvas.portals ?? []),
  ]
}

/** The canvas with `change` applied to the box of every node (undefined leaves it as is). */
function withBoxes(
  canvas: ProjectCanvas,
  change: (box: Box) => Partial<Omit<Box, 'id'>> | undefined,
): ProjectCanvas {
  const apply = <T extends { x: number; y: number; width: number; height: number }>(
    item: T,
    id: string,
  ): T => ({ ...item, ...(change({ ...item, id }) ?? {}) })
  return {
    ...canvas,
    nodes: canvas.nodes.map((node) => apply(node, node.agentId)),
    notes: (canvas.notes ?? []).map((note) => apply(note, note.id)),
    texts: (canvas.texts ?? []).map((text) => apply(text, text.id)),
    portals: (canvas.portals ?? []).map((portal) => apply(portal, portal.id)),
  }
}

/** React Flow nodes for everything placed on the project's canvas. */
export function toFlowNodes(project: Project): CanvasFlowNode[] {
  const canvas = canvasOf(project)
  const box = (b: { x: number; y: number; width: number; height: number }) => ({
    position: { x: b.x, y: b.y },
    width: b.width,
    height: b.height,
  })

  const agents = canvas.nodes.flatMap((node): AgentFlowNode[] => {
    const agent = project.agents.find((a) => a.id === node.agentId)
    if (!agent) return []
    return [
      {
        id: node.agentId,
        type: 'agent',
        ...box(node),
        deletable: false,
        dragHandle: '.canvas-node-handle',
        data: { projectId: project.id, agent },
      },
    ]
  })
  const notes = canvas.notes.map((note): NoteFlowNode => ({
    id: note.id,
    type: 'note',
    ...box(note),
    dragHandle: '.canvas-node-handle',
    data: { projectId: project.id, note },
  }))
  const texts = canvas.texts.map((text): TextFlowNode => ({
    id: text.id,
    type: 'text',
    ...box(text),
    data: { text },
  }))
  const portals = canvas.portals.map((portal): PortalFlowNode => ({
    id: portal.id,
    type: 'portal',
    ...box(portal),
    dragHandle: '.canvas-node-handle',
    data: { projectId: project.id, portal },
  }))
  // Texts first, so everything else is drawn over them.
  return [...texts, ...notes, ...portals, ...agents]
}

/** Lines between agents carry messages (arrow, animated while used); other links don't. */
export function toFlowEdges(project: Project, active: Set<string>): Edge[] {
  const canvas = canvasOf(project)
  const agents = new Set(canvas.nodes.map((node) => node.agentId))
  return canvas.edges.map((edge) => {
    const betweenAgents = agents.has(edge.from) && agents.has(edge.to)
    return {
      id: edge.id,
      type: 'floating',
      source: edge.from,
      target: edge.to,
      animated: betweenAgents && active.has(edge.id) && !edge.paused,
      className: betweenAgents
        ? edge.paused
          ? 'canvas-edge-paused'
          : undefined
        : 'canvas-edge-note',
      markerEnd: betweenAgents ? { type: 'arrowclosed' as const } : undefined,
    }
  })
}

/** Whether a line connects two agents (only those carry messages and can be paused). */
export function isAgentEdge(canvas: ProjectCanvas, edge: CanvasEdge): boolean {
  const agents = new Set(canvas.nodes.map((node) => node.agentId))
  return agents.has(edge.from) && agents.has(edge.to)
}

/** The canvas with each node's place and size as they are on screen now. */
export function withLayout(canvas: ProjectCanvas, nodes: CanvasFlowNode[]): ProjectCanvas {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  return withBoxes(canvas, (box) => {
    const node = byId.get(box.id)
    if (!node) return undefined
    return {
      x: Math.round(node.position.x),
      y: Math.round(node.position.y),
      width: Math.round(node.width ?? node.measured?.width ?? box.width),
      height: Math.round(node.height ?? node.measured?.height ?? box.height),
    }
  })
}

export function withEdge(canvas: ProjectCanvas, edge: CanvasEdge): ProjectCanvas {
  const exists = canvas.edges.some(
    (e) =>
      (e.from === edge.from && e.to === edge.to) ||
      (e.from === edge.to && e.to === edge.from && !isAgentEdge(canvas, edge)),
  )
  return exists ? canvas : { ...canvas, edges: [...canvas.edges, edge] }
}

/** Removes nodes of any kind, and every line touching them (agents stay in the project). */
export function withoutNodes(canvas: ProjectCanvas, ids: Set<string>): ProjectCanvas {
  return {
    nodes: canvas.nodes.filter((node) => !ids.has(node.agentId)),
    notes: (canvas.notes ?? []).filter((note) => !ids.has(note.id)),
    texts: (canvas.texts ?? []).filter((text) => !ids.has(text.id)),
    portals: (canvas.portals ?? []).filter((portal) => !ids.has(portal.id)),
    edges: canvas.edges.filter(
      (edge) => !ids.has(edge.id) && !ids.has(edge.from) && !ids.has(edge.to),
    ),
  }
}

/** Puts an agent on the canvas, centred on `center`. */
export function withAgentNode(
  canvas: ProjectCanvas,
  agentId: string,
  center: XYPosition,
): ProjectCanvas {
  const node = {
    agentId,
    ...snapped({
      x: center.x - AGENT_NODE_SIZE.width / 2,
      y: center.y - AGENT_NODE_SIZE.height / 2,
    }),
    ...AGENT_NODE_SIZE,
  }
  return { ...canvas, nodes: [...canvas.nodes, node] }
}

export function withNote(canvas: ProjectCanvas, note: CanvasNoteNode): ProjectCanvas {
  return { ...canvas, notes: [...(canvas.notes ?? []), note] }
}

export function withText(canvas: ProjectCanvas, text: CanvasTextNode): ProjectCanvas {
  return { ...canvas, texts: [...(canvas.texts ?? []), text] }
}

export function withPortal(canvas: ProjectCanvas, portal: CanvasPortalNode): ProjectCanvas {
  return { ...canvas, portals: [...(canvas.portals ?? []), portal] }
}

export function patchNote(
  canvas: ProjectCanvas,
  id: string,
  patch: Partial<CanvasNoteNode>,
): ProjectCanvas {
  return {
    ...canvas,
    notes: (canvas.notes ?? []).map((note) => (note.id === id ? { ...note, ...patch } : note)),
  }
}

export function patchText(
  canvas: ProjectCanvas,
  id: string,
  patch: Partial<CanvasTextNode>,
): ProjectCanvas {
  return {
    ...canvas,
    texts: (canvas.texts ?? []).map((text) => (text.id === id ? { ...text, ...patch } : text)),
  }
}

export function patchPortal(
  canvas: ProjectCanvas,
  id: string,
  patch: Partial<CanvasPortalNode>,
): ProjectCanvas {
  return {
    ...canvas,
    portals: (canvas.portals ?? []).map((portal) =>
      portal.id === id ? { ...portal, ...patch } : portal,
    ),
  }
}

/**
 * Arranges the given nodes in a tidy grid, in reading order, starting where the top-left one
 * is. Columns are as wide as the widest node.
 */
export function withGrid(canvas: ProjectCanvas, ids: string[]): ProjectCanvas {
  const wanted = new Set(ids)
  const boxes = boxesOf(canvas).filter((box) => wanted.has(box.id))
  if (boxes.length < 2) return canvas

  boxes.sort((a, b) => a.y - b.y || a.x - b.x)
  const columns = Math.ceil(Math.sqrt(boxes.length))
  const cellWidth = Math.max(...boxes.map((b) => b.width)) + GRID * 3
  const left = Math.min(...boxes.map((b) => b.x))
  const top = Math.min(...boxes.map((b) => b.y))
  const rows: Box[][] = []
  boxes.forEach((box, i) => (rows[Math.floor(i / columns)] ??= []).push(box))

  const place = new Map<string, XYPosition>()
  let y = top
  for (const row of rows) {
    row.forEach((box, column) => place.set(box.id, snapped({ x: left + column * cellWidth, y })))
    y += Math.max(...row.map((b) => b.height)) + GRID * 3
  }
  return withBoxes(canvas, (box) => place.get(box.id))
}

export const ALIGNMENTS = [
  'left',
  'centerX',
  'right',
  'top',
  'centerY',
  'bottom',
  'distributeX',
  'distributeY',
] as const
export type Alignment = (typeof ALIGNMENTS)[number]

/**
 * Lines the given nodes up on one edge or center, or spaces them evenly between the first
 * and the last one (needs three or more to distribute).
 */
export function withAlignment(
  canvas: ProjectCanvas,
  ids: string[],
  mode: Alignment,
): ProjectCanvas {
  const wanted = new Set(ids)
  const boxes = boxesOf(canvas).filter((box) => wanted.has(box.id))
  if (boxes.length < 2) return canvas

  const left = Math.min(...boxes.map((b) => b.x))
  const right = Math.max(...boxes.map((b) => b.x + b.width))
  const top = Math.min(...boxes.map((b) => b.y))
  const bottom = Math.max(...boxes.map((b) => b.y + b.height))
  const place = new Map<string, Partial<XYPosition>>()

  const distribute = (axis: 'x' | 'y'): void => {
    const size = axis === 'x' ? 'width' : 'height'
    const sorted = [...boxes].sort((a, b) => a[axis] - b[axis])
    const span =
      (axis === 'x' ? right - left : bottom - top) - sorted.reduce((sum, b) => sum + b[size], 0)
    const gap = span / (sorted.length - 1)
    let at = axis === 'x' ? left : top
    for (const box of sorted) {
      place.set(box.id, { [axis]: Math.round(at) })
      at += box[size] + gap
    }
  }

  const aligned: Record<string, (box: Box) => Partial<XYPosition>> = {
    left: () => ({ x: left }),
    right: (box) => ({ x: right - box.width }),
    centerX: (box) => ({ x: Math.round((left + right) / 2 - box.width / 2) }),
    top: () => ({ y: top }),
    bottom: (box) => ({ y: bottom - box.height }),
    centerY: (box) => ({ y: Math.round((top + bottom) / 2 - box.height / 2) }),
  }
  if (aligned[mode]) for (const box of boxes) place.set(box.id, aligned[mode](box))
  if (mode === 'distributeX' && boxes.length > 2) distribute('x')
  if (mode === 'distributeY' && boxes.length > 2) distribute('y')

  return withBoxes(canvas, (box) => place.get(box.id))
}

/** A point rounded to the grid. */
export function snapped({ x, y }: XYPosition): XYPosition {
  return { x: Math.round(x / GRID) * GRID, y: Math.round(y / GRID) * GRID }
}
