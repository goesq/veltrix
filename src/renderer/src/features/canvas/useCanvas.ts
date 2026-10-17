import { useEffect, useMemo, useRef, useState } from 'react'
import {
  applyNodeChanges,
  type Connection,
  type Edge,
  type NodeChange,
  type XYPosition,
} from '@xyflow/react'
import { AGENT_TOOLS, type AgentTool } from '@shared/ai'
import { canvasOf } from '@shared/canvas'
import type {
  CanvasNoteNode,
  CanvasPortalNode,
  CanvasTextNode,
  Project,
  ProjectCanvas,
} from '@shared/types'
import { api } from '../../lib/api'
import { colorAt } from '../../lib/colors'
import { useLive } from '../../stores/live'
import {
  isAgentEdge,
  NOTE_SIZE,
  patchNote,
  patchText,
  snapped,
  TEXT_SIZE,
  toFlowEdges,
  toFlowNodes,
  withAgentNode,
  withAlignment,
  withEdge,
  withGrid,
  withLayout,
  withNote,
  withPortal,
  patchPortal,
  PORTAL_SIZE,
  withoutNodes,
  withText,
  type Alignment,
  type CanvasFlowNode,
} from './canvasModel'

/** How long a line stays animated after a message went through it. */
const ACTIVE_EDGE_MS = 4000

/** What a new note starts with. */
export const NOTE_TEMPLATES = { note: '', checklist: '- [ ] ' } as const
export type NoteTemplate = keyof typeof NOTE_TEMPLATES

/**
 * The canvas of a project as React Flow sees it. Nodes move locally while dragged and are
 * saved when a drag or resize ends; everything else is saved at once and comes back
 * through the project update.
 */
export function useCanvas(project: Project) {
  const canvas = canvasOf(project)
  const [nodes, setNodes] = useState<CanvasFlowNode[]>(() => toFlowNodes(project))
  const [justCreated, setJustCreated] = useState<string | null>(null)
  const activeEdges = useActiveEdges(project)
  const startLive = useLive((s) => s.start)
  const stopLive = useLive((s) => s.stop)

  // Re-sync only when the stored canvas or the agents change, not on every project update
  // (task progress), so a drag in progress isn't reset.
  const syncKey = JSON.stringify([canvas.nodes, canvas.notes, canvas.texts, project.agents])
  useEffect(() => {
    setNodes((current) => {
      const selected = new Set(current.filter((n) => n.selected).map((n) => n.id))
      return toFlowNodes(project).map((n) => ({ ...n, selected: selected.has(n.id) }))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncKey])

  const history = useCanvasHistory(project.id, canvas)
  /** Saves a change the user can undo. */
  const save = (next: ProjectCanvas): void => history.change(next)

  const onNodesChange = (changes: NodeChange<CanvasFlowNode>[]): void => {
    // Removals go through `remove`, which also handles notes' files and lines.
    const next = applyNodeChanges(
      changes.filter((c) => c.type !== 'remove'),
      nodes,
    )
    setNodes(next)
    const settled = changes.some(
      (c) =>
        (c.type === 'position' && c.dragging === false) ||
        (c.type === 'dimensions' && c.resizing === false),
    )
    if (settled) save(withLayout(canvas, next))
  }

  const onConnect = ({ source, target }: Connection): void => {
    const texts = new Set(canvas.texts.map((text) => text.id))
    if (source === target || texts.has(source) || texts.has(target)) return
    save(withEdge(canvas, { id: crypto.randomUUID(), from: source, to: target }))
  }

  const onEdgeClick = (_event: unknown, edge: Edge): void => {
    const stored = canvas.edges.find((e) => e.id === edge.id)
    if (stored && isAgentEdge(canvas, stored)) {
      void api.canvas.setEdgePaused(project.id, stored.id, !stored.paused)
    }
  }

  /** Takes nodes and lines off the canvas; running agents taken off are stopped. */
  const remove = (ids: string[]): void => {
    const gone = new Set(ids)
    for (const node of canvas.nodes) {
      if (gone.has(node.agentId)) void stopLive(project.id, node.agentId)
    }
    save(withoutNodes(canvas, gone))
  }

  const addAgent = (agentId: string, center: XYPosition): void =>
    save(withAgentNode(canvas, agentId, center))

  /** Creates an agent running `tool`, puts it on the canvas and starts its session. */
  const createAgent = async (tool: AgentTool, center: XYPosition): Promise<void> => {
    const agent = await api.projects.saveAgent(project.id, {
      name: uniqueName(
        AGENT_TOOLS[tool].name,
        project.agents.map((a) => a.name),
      ),
      role: '',
      provider: tool,
      color: colorAt(project.agents.length),
    })
    await api.canvas.save(project.id, withAgentNode(canvas, agent.id, center))
    await startLive(project.id, agent.id)
  }

  const addNote = async (template: NoteTemplate, at: XYPosition): Promise<void> => {
    const note: CanvasNoteNode = {
      id: crypto.randomUUID(),
      ...snapped(at),
      ...NOTE_SIZE,
      color: template === 'checklist' ? 'green' : 'yellow',
    }
    await api.notes.write(project.id, note.id, NOTE_TEMPLATES[template])
    setJustCreated(note.id)
    save(withNote(canvas, note))
  }

  const addText = (at: XYPosition): void => {
    const text: CanvasTextNode = { id: crypto.randomUUID(), ...snapped(at), ...TEXT_SIZE, text: '' }
    setJustCreated(text.id)
    save(withText(canvas, text))
  }

  /** Copies of the selected notes and labels, a little down and to the right. */
  const duplicate = async (ids: string[]): Promise<void> => {
    const offset = (box: { x: number; y: number }) => ({ x: box.x + 40, y: box.y + 40 })
    const notes = await Promise.all(
      canvas.notes
        .filter((note) => ids.includes(note.id))
        .map(async (note) => {
          const copy = { ...note, ...offset(note), id: crypto.randomUUID(), locked: false }
          await api.notes.write(project.id, copy.id, await api.notes.read(project.id, note.id))
          return copy
        }),
    )
    const texts = canvas.texts
      .filter((text) => ids.includes(text.id))
      .map((text) => ({ ...text, ...offset(text), id: crypto.randomUUID() }))
    if (notes.length + texts.length === 0) return
    save({ ...canvas, notes: [...canvas.notes, ...notes], texts: [...canvas.texts, ...texts] })
  }

  const tidy = (ids: string[]): void => save(withGrid(canvas, ids))
  const align = (ids: string[], mode: Alignment): void => save(withAlignment(canvas, ids, mode))

  const addPortal = (at: XYPosition): void => {
    const portal: CanvasPortalNode = {
      id: crypto.randomUUID(),
      ...snapped(at),
      ...PORTAL_SIZE,
      url: 'about:blank',
    }
    setJustCreated(portal.id)
    save(withPortal(canvas, portal))
  }

  /** Browsing isn't something to undo, so a portal's page is saved outside the history. */
  const rememberPortalUrl = (id: string, url: string): void =>
    void api.canvas.save(project.id, patchPortal(canvas, id, { url }))

  const updateNote = (id: string, patch: Partial<CanvasNoteNode>): void =>
    save(patchNote(canvas, id, patch))
  const updateText = (id: string, patch: Partial<CanvasTextNode>): void =>
    save(patchText(canvas, id, patch))

  const edges = useMemo(() => toFlowEdges(project, activeEdges), [project, activeEdges])
  const onCanvas = new Set(canvas.nodes.map((n) => n.agentId))
  const offCanvas = project.agents.filter((agent) => !onCanvas.has(agent.id))

  return {
    nodes,
    edges,
    offCanvas,
    justCreated,
    onNodesChange,
    onConnect,
    onEdgeClick,
    remove,
    addAgent,
    createAgent,
    addNote,
    addText,
    addPortal,
    rememberPortalUrl,
    updateNote,
    updateText,
    duplicate,
    tidy,
    align,
    undo: history.undo,
    redo: history.redo,
    selected: nodes.filter((n) => n.selected).map((n) => n.id),
    /** Selects exactly these nodes (keyboard navigation). */
    select: (ids: string[]) =>
      setNodes((current) => current.map((n) => ({ ...n, selected: ids.includes(n.id) }))),
  }
}

/** Changes the user can step back through, kept while the canvas is open. */
const HISTORY_LIMIT = 50

/**
 * Undo and redo for the canvas: every change remembers the canvas it replaced. Undoing
 * saves that earlier canvas again (deleted notes come back from the trash in `.veltrix`).
 */
function useCanvasHistory(projectId: string, current: ProjectCanvas) {
  const past = useRef<ProjectCanvas[]>([])
  const future = useRef<ProjectCanvas[]>([])
  const latest = useRef(current)
  latest.current = current

  useEffect(() => {
    past.current = []
    future.current = []
  }, [projectId])

  const write = (canvas: ProjectCanvas): void => void api.canvas.save(projectId, canvas)

  return {
    change(next: ProjectCanvas): void {
      past.current = [...past.current, latest.current].slice(-HISTORY_LIMIT)
      future.current = []
      write(next)
    },
    undo(): void {
      const previous = past.current.pop()
      if (!previous) return
      future.current.push(latest.current)
      write(previous)
    },
    redo(): void {
      const next = future.current.pop()
      if (!next) return
      past.current.push(latest.current)
      write(next)
    },
  }
}

/** `name`, or `name 2`, `name 3`… when another agent already has it. */
function uniqueName(name: string, taken: string[]): string {
  const used = new Set(taken.map((n) => n.trim().toLowerCase()))
  if (!used.has(name.toLowerCase())) return name
  let n = 2
  while (used.has(`${name} ${n}`.toLowerCase())) n++
  return `${name} ${n}`
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
