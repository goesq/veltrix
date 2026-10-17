import { useEffect, type ReactNode, type RefObject } from 'react'
import {
  AlignCenterVertical,
  Bot,
  Copy,
  Hand,
  LayoutGrid,
  ListChecks,
  MousePointer2,
  Redo2,
  StickyNote,
  Trash2,
  Type,
  Undo2,
} from 'lucide-react'
import { AGENT_TOOL_IDS, AGENT_TOOLS, type AgentTool } from '@shared/ai'
import type { Agent } from '@shared/types'
import { IconButton } from '../../components/ui/Button'
import { Menu } from '../../components/ui/Menu'
import { useT } from '../../i18n'
import { isMac } from '../../lib/api'
import { useAiTools } from '../../stores/aiTools'
import { ALIGNMENTS, type Alignment } from './canvasModel'

/** What a click on the empty canvas does. */
export type CanvasTool = 'select' | 'hand' | 'note' | 'checklist' | 'text'

/** Single-key shortcuts, active while nothing is being typed (as in Maestri and Figma). */
export const TOOL_KEYS: Record<string, CanvasTool> = {
  v: 'select',
  h: 'hand',
  n: 'note',
  c: 'checklist',
  l: 'text',
}
/** Opens the agent menu. */
export const AGENT_KEY = 't'

interface CanvasToolbarProps {
  tool: CanvasTool
  onTool(tool: CanvasTool): void
  /** Agents of the project not on the canvas yet. */
  offCanvas: Agent[]
  onAddAgent(agentId: string): void
  onCreateAgent(tool: AgentTool): void
  /** The agent button, so its shortcut can open the menu. */
  agentButton: RefObject<HTMLButtonElement | null>
  /** How many nodes are selected; actions on the selection show while there are some. */
  selection: number
  onUndo(): void
  onRedo(): void
  onDuplicate(): void
  onTidy(): void
  onAlign(mode: Alignment): void
  onDelete(): void
}

/** Floating tools at the top of the canvas: select, pan, agents, notes, checklists and text. */
export function CanvasToolbar({
  tool,
  onTool,
  offCanvas,
  onAddAgent,
  onCreateAgent,
  agentButton,
  selection,
  onUndo,
  onRedo,
  onDuplicate,
  onTidy,
  onAlign,
  onDelete,
}: CanvasToolbarProps) {
  const t = useT()
  const { installed, refresh } = useAiTools()
  const mod = isMac ? '⌘' : 'Ctrl+'

  useEffect(() => {
    if (!installed) void refresh()
  }, [installed, refresh])

  // Installed CLIs only, once known; all of them until then.
  const tools = AGENT_TOOL_IDS.filter((id) => !installed || installed[AGENT_TOOLS[id].binary])
  const agentItems = [
    ...offCanvas.map((agent) => ({
      id: agent.id,
      label: agent.name,
      hint: agent.role || undefined,
      onSelect: () => onAddAgent(agent.id),
    })),
    ...tools.map((id) => ({
      id: `new-${id}`,
      label: t.canvas.newAgentWith(AGENT_TOOLS[id].name),
      hint: t.canvas.newAgentHint,
      onSelect: () => onCreateAgent(id),
    })),
  ]

  const toolButton = (id: CanvasTool, label: string, key: string, icon: ReactNode) => (
    <IconButton
      label={`${label} (${key.toUpperCase()})`}
      active={tool === id}
      onClick={() => onTool(id)}
      className="size-8"
    >
      {icon}
    </IconButton>
  )

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-line bg-panel/95 p-1 shadow-lg shadow-black/30">
      {toolButton('select', t.canvas.tools.select, 'v', <MousePointer2 size={15} />)}
      {toolButton('hand', t.canvas.tools.hand, 'h', <Hand size={15} />)}
      <span className="mx-1 h-5 w-px bg-line" />
      <Menu
        items={agentItems}
        trigger={({ open, toggle }) => (
          <IconButton
            ref={agentButton}
            label={`${t.canvas.tools.agent} (${AGENT_KEY.toUpperCase()})`}
            active={open}
            onClick={toggle}
            className="size-8"
          >
            <Bot size={15} />
          </IconButton>
        )}
      />
      {toolButton('note', t.canvas.tools.note, 'n', <StickyNote size={15} />)}
      {toolButton('checklist', t.canvas.tools.checklist, 'c', <ListChecks size={15} />)}
      {toolButton('text', t.canvas.tools.text, 'l', <Type size={15} />)}
      <span className="mx-1 h-5 w-px bg-line" />
      <IconButton label={`${t.canvas.undo} (${mod}Z)`} onClick={onUndo} className="size-8">
        <Undo2 size={15} />
      </IconButton>
      <IconButton
        label={`${t.canvas.redo} (${mod}${isMac ? '⇧' : 'Shift+'}Z)`}
        onClick={onRedo}
        className="size-8"
      >
        <Redo2 size={15} />
      </IconButton>
      {selection > 0 && (
        <>
          <span className="mx-1 h-5 w-px bg-line" />
          <IconButton
            label={`${t.canvas.duplicate} (${mod}D)`}
            onClick={onDuplicate}
            className="size-8"
          >
            <Copy size={15} />
          </IconButton>
          {selection > 1 && (
            <>
              <IconButton label={t.canvas.tidy} onClick={onTidy} className="size-8">
                <LayoutGrid size={15} />
              </IconButton>
              <Menu
                items={ALIGNMENTS.filter(
                  (mode) => selection > 2 || !mode.startsWith('distribute'),
                ).map((mode) => ({
                  id: mode,
                  label: t.canvas.align[mode],
                  onSelect: () => onAlign(mode),
                }))}
                trigger={({ open, toggle }) => (
                  <IconButton
                    label={t.canvas.alignLabel}
                    active={open}
                    onClick={toggle}
                    className="size-8"
                  >
                    <AlignCenterVertical size={15} />
                  </IconButton>
                )}
              />
            </>
          )}
          <IconButton label={t.canvas.deleteSelection} onClick={onDelete} className="size-8">
            <Trash2 size={15} />
          </IconButton>
        </>
      )}
    </div>
  )
}
