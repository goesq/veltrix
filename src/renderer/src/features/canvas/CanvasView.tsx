import '@xyflow/react/dist/style.css'
import { useEffect } from 'react'
import { Background, Controls, MiniMap, Panel, ReactFlow, ReactFlowProvider } from '@xyflow/react'
import { Plus } from 'lucide-react'
import type { Project } from '@shared/types'
import { Button } from '../../components/ui/Button'
import { Menu } from '../../components/ui/Menu'
import { useT } from '../../i18n'
import { useLive } from '../../stores/live'
import { AgentNode } from './AgentNode'
import { CanvasActionsContext } from './canvasActions'
import { MessageFeed } from './MessageFeed'
import { useCanvas } from './useCanvas'

const nodeTypes = { agent: AgentNode }

/** The project's live agents on an infinite canvas, connected by message lines. */
export function CanvasView({ project }: { project: Project }) {
  return (
    <ReactFlowProvider>
      <Canvas project={project} />
    </ReactFlowProvider>
  )
}

function Canvas({ project }: { project: Project }) {
  const canvas = useCanvas(project)
  const loadLive = useLive((s) => s.load)
  const error = useLive((s) => s.error)
  const dismissError = useLive((s) => s.dismissError)
  const t = useT()

  useEffect(() => {
    void loadLive(project.id)
  }, [loadLive, project.id])

  return (
    <CanvasActionsContext.Provider value={{ removeFromCanvas: canvas.removeFromCanvas }}>
      <ReactFlow
        colorMode="dark"
        nodes={canvas.nodes}
        edges={canvas.edges}
        nodeTypes={nodeTypes}
        onNodesChange={canvas.onNodesChange}
        onConnect={canvas.onConnect}
        onEdgesDelete={canvas.onEdgesDelete}
        onEdgeClick={canvas.onEdgeClick}
        deleteKeyCode={['Delete', 'Backspace']}
        minZoom={0.2}
        maxZoom={1.5}
        fitView
        fitViewOptions={{ maxZoom: 1, padding: 0.2 }}
      >
        <Background gap={24} size={1} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable className="!bg-surface" />

        <Panel position="top-left" className="flex items-center gap-2">
          <AddAgentMenu offCanvas={canvas.offCanvas} onAdd={canvas.addAgent} />
          <span className="text-xs text-faint">{t.canvas.edgeHint}</span>
        </Panel>
        <Panel position="top-right">
          <MessageFeed project={project} />
        </Panel>
        {error && (
          <Panel position="top-center">
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
          <Panel position="top-center" className="!mt-24 max-w-sm text-center">
            <p className="font-medium">{t.canvas.emptyTitle}</p>
            <p className="mt-1 text-xs text-muted">
              {project.agents.length ? t.canvas.emptyDescription : t.canvas.noAgents}
            </p>
          </Panel>
        )}
      </ReactFlow>
    </CanvasActionsContext.Provider>
  )
}

interface AddAgentMenuProps {
  offCanvas: Project['agents']
  onAdd(agentId: string): void
}

function AddAgentMenu({ offCanvas, onAdd }: AddAgentMenuProps) {
  const t = useT()
  return (
    <Menu
      items={offCanvas.map((agent) => ({
        id: agent.id,
        label: agent.name,
        hint: agent.role || undefined,
        onSelect: () => onAdd(agent.id),
      }))}
      trigger={({ toggle }) => (
        <Button
          icon={<Plus size={14} />}
          disabled={offCanvas.length === 0}
          title={offCanvas.length === 0 ? t.canvas.allOnCanvas : undefined}
          onClick={toggle}
          className="bg-panel"
        >
          {t.canvas.addAgent}
        </Button>
      )}
    />
  )
}
