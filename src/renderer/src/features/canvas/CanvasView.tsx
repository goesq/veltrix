import '@xyflow/react/dist/style.css'
import { useEffect, useRef, useState, type MouseEvent } from 'react'
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react'
import type { Project } from '@shared/types'
import { useT } from '../../i18n'
import { api } from '../../lib/api'
import { cn } from '../../lib/cn'
import { useLive } from '../../stores/live'
import { AgentNode } from './AgentNode'
import { CanvasActionsContext, type CanvasActions } from './canvasActions'
import { GRID } from './canvasModel'
import { AGENT_KEY, CanvasToolbar, TOOL_KEYS, type CanvasTool } from './CanvasToolbar'
import { FloatingEdge } from './FloatingEdge'
import { LiftedPanel } from './LiftedPanel'
import { MessageFeed } from './MessageFeed'
import { NoteNode } from './NoteNode'
import { PortalNode } from './PortalNode'
import { TextNode } from './TextNode'
import { useCanvas } from './useCanvas'
import { useNodeNavigation } from './useNodeNavigation'

const nodeTypes = { agent: AgentNode, note: NoteNode, text: TextNode, portal: PortalNode }
const edgeTypes = { floating: FloatingEdge }

/**
 * The project's live agents on an infinite canvas, with notes, checklists and labels around
 * them. Lines let agents message each other and read and edit the notes they reach.
 */
export function CanvasView({ project }: { project: Project }) {
  return (
    <ReactFlowProvider>
      <Canvas project={project} />
    </ReactFlowProvider>
  )
}

function Canvas({ project }: { project: Project }) {
  const canvas = useCanvas(project)
  const [tool, setTool] = useState<CanvasTool>('select')
  const [lifted, setLifted] = useState<string | null>(null)
  const agentButton = useRef<HTMLButtonElement>(null)
  const { screenToFlowPosition } = useReactFlow()
  const containerRef = useRef<HTMLDivElement>(null)
  const loadLive = useLive((s) => s.load)
  const error = useLive((s) => s.error)
  const dismissError = useLive((s) => s.dismissError)
  const t = useT()

  useEffect(() => {
    void loadLive(project.id)
  }, [loadLive, project.id])

  // Agents edit notes on disk; watch them while the canvas is open.
  useEffect(() => {
    void api.notes.watch(project.id)
    return () => void api.notes.unwatch(project.id)
  }, [project.id])

  const navigation = useNodeNavigation(project.id, canvas.nodes, canvas.select)
  useCanvasShortcuts({
    setTool,
    next: navigation.next,
    previous: navigation.previous,
    nextWaiting: navigation.nextWaiting,
    liftSelected: () => navigation.single && setLifted(navigation.single),
    openAgentMenu: () => agentButton.current?.click(),
    closeLifted: lifted ? () => setLifted(null) : undefined,
    undo: canvas.undo,
    redo: canvas.redo,
    duplicate: () => void canvas.duplicate(canvas.selected),
  })
  // The hand tool, or Space held with any tool: dragging anywhere moves the canvas.
  const spaceHeld = useSpaceHeld(!lifted)
  const panning = tool === 'hand' || spaceHeld

  /** The middle of what is on screen, in canvas coordinates. */
  const viewCenter = () => {
    const box = containerRef.current!.getBoundingClientRect()
    return screenToFlowPosition({ x: box.left + box.width / 2, y: box.top + box.height / 2 })
  }

  const onPaneClick = (event: MouseEvent): void => {
    if (!placing) return
    const at = screenToFlowPosition({ x: event.clientX, y: event.clientY })
    if (tool === 'text') canvas.addText(at)
    else if (tool === 'portal') canvas.addPortal(at)
    else void canvas.addNote(tool, at)
    setTool('select')
  }

  const actions: CanvasActions = {
    remove: canvas.remove,
    updateNote: canvas.updateNote,
    updateText: canvas.updateText,
    rememberPortalUrl: canvas.rememberPortalUrl,
    lift: setLifted,
    lifted,
    justCreated: canvas.justCreated,
  }
  const placing =
    !panning && (tool === 'note' || tool === 'checklist' || tool === 'text' || tool === 'portal')

  return (
    <CanvasActionsContext.Provider value={actions}>
      <div ref={containerRef} className="relative h-full w-full">
        <ReactFlow
          colorMode="dark"
          className={cn(placing && 'canvas-placing', panning && 'canvas-panning')}
          nodes={canvas.nodes}
          edges={canvas.edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={canvas.onNodesChange}
          onConnect={canvas.onConnect}
          onDelete={({ nodes, edges }) =>
            canvas.remove([...nodes.map((n) => n.id), ...edges.map((e) => e.id)])
          }
          onEdgeClick={canvas.onEdgeClick}
          onPaneClick={onPaneClick}
          connectionMode={ConnectionMode.Loose}
          deleteKeyCode={['Delete', 'Backspace']}
          // Select: drag on the empty canvas draws a selection. Panning: drag moves the canvas,
          // over nodes too (CSS lets the pointer through them). The middle and right buttons
          // always pan. Space is handled by useSpaceHeld, not React Flow, which pans only
          // on empty canvas.
          selectionOnDrag={tool === 'select' && !panning}
          panOnDrag={panning ? true : [1, 2]}
          panActivationKeyCode={null}
          panOnScroll
          snapToGrid
          snapGrid={[GRID, GRID]}
          minZoom={0.15}
          maxZoom={1.5}
          fitView
          fitViewOptions={{ maxZoom: 1, padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={GRID} size={1.2} />
          <Controls showInteractive={false} position="bottom-right" />
          <MiniMap pannable zoomable position="bottom-left" className="!bg-surface" />

          <Panel position="top-center">
            <CanvasToolbar
              tool={tool}
              onTool={setTool}
              offCanvas={canvas.offCanvas}
              onAddAgent={(agentId) => canvas.addAgent(agentId, viewCenter())}
              onCreateAgent={(agentTool) => void canvas.createAgent(agentTool, viewCenter())}
              agentButton={agentButton}
              selection={canvas.selected.length}
              onUndo={canvas.undo}
              onRedo={canvas.redo}
              onDuplicate={() => void canvas.duplicate(canvas.selected)}
              onTidy={() => canvas.tidy(canvas.selected)}
              onAlign={(mode) => canvas.align(canvas.selected, mode)}
              onDelete={() => canvas.remove(canvas.selected)}
            />
          </Panel>
          <Panel position="top-right">
            <MessageFeed project={project} />
          </Panel>
          {error && (
            <Panel position="bottom-center">
              <button
                type="button"
                onClick={dismissError}
                title={t.common.dismiss}
                className="max-w-lg rounded-md border border-danger/40 bg-panel px-3 py-2 text-left text-xs text-danger"
              >
                {error}
              </button>
            </Panel>
          )}
          {canvas.nodes.length === 0 && (
            <Panel position="top-center" className="!mt-24 max-w-md text-center">
              <p className="font-medium">{t.canvas.emptyTitle}</p>
              <p className="mt-1 text-xs text-muted">{t.canvas.emptyDescription}</p>
            </Panel>
          )}
        </ReactFlow>
        <LiftedPanel project={project} />
      </div>
    </CanvasActionsContext.Provider>
  )
}

interface CanvasShortcuts {
  setTool(tool: CanvasTool): void
  next(): void
  previous(): void
  nextWaiting(): void
  liftSelected(): void
  openAgentMenu(): void
  undo(): void
  redo(): void
  duplicate(): void
  /** Set while a node is lifted: Escape puts it back. */
  closeLifted?(): void
}

/**
 * Single-key tools (V, H, T, N, C, L), moving between nodes (] and [, W for the next agent
 * waiting, Enter to enlarge), Escape, undo / redo (⌘Z, ⌘⇧Z) and duplicate (⌘D).
 * Keys typed into a field, a note or a terminal are left alone, so agents still get every
 * keystroke.
 */
function useCanvasShortcuts(shortcuts: CanvasShortcuts): void {
  const latest = useRef(shortcuts)
  latest.current = shortcuts

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (isTyping(event.target) || event.altKey) return
      const shortcuts = latest.current
      const { setTool, openAgentMenu, closeLifted, undo, redo, duplicate } = shortcuts
      const key = event.key.toLowerCase()

      if (event.ctrlKey || event.metaKey) {
        const command =
          key === 'z'
            ? event.shiftKey
              ? redo
              : undo
            : key === 'y'
              ? redo
              : key === 'd'
                ? duplicate
                : null
        if (command && !closeLifted) {
          event.preventDefault()
          command()
        }
        return
      }
      if (event.repeat) return

      if (key === 'escape') {
        if (closeLifted) closeLifted()
        else setTool('select')
        return
      }
      if (closeLifted) return
      const move = {
        ']': shortcuts.next,
        '[': shortcuts.previous,
        w: shortcuts.nextWaiting,
        // Enter on a focused button presses the button instead.
        enter: event.target instanceof HTMLButtonElement ? undefined : shortcuts.liftSelected,
      }[key]
      if (move) {
        event.preventDefault()
        move()
      } else if (key === AGENT_KEY) {
        event.preventDefault()
        openAgentMenu()
      } else if (TOOL_KEYS[key]) {
        setTool(TOOL_KEYS[key])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

/** Whether Space is being held on the canvas (not typed into a field, a note or a terminal). */
function useSpaceHeld(enabled: boolean): boolean {
  const [held, setHeld] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setHeld(false)
      return
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.code !== 'Space' || isTyping(event.target)) return
      // Keeps Space from pressing the focused button or scrolling.
      event.preventDefault()
      if (!event.repeat) setHeld(true)
    }
    const onKeyUp = (event: KeyboardEvent): void => {
      if (event.code !== 'Space') return
      setHeld(false)
      // A focused button activates on Space's release; this Space was for panning.
      if (!isTyping(event.target)) event.preventDefault()
    }
    const release = (): void => setHeld(false)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', release)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', release)
    }
  }, [enabled])

  return held
}

/** Keys pressed here belong to what is being typed, not to the canvas. */
function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    !!target.closest('input, textarea, select, [contenteditable], .xterm')
  )
}
