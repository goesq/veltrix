import { useReactFlow } from '@xyflow/react'
import { sessionKey } from '../../lib/liveBus'
import { useAttention } from '../../stores/attention'
import type { CanvasFlowNode } from './canvasModel'

/** Zoom used when the keyboard brings a node into view, unless already closer. */
const FOCUS_ZOOM = 0.85

/**
 * Moving between nodes from the keyboard: next and previous in reading order, and the next
 * agent waiting for the user. The camera glides to the node and selects it.
 */
export function useNodeNavigation(
  projectId: string,
  nodes: CanvasFlowNode[],
  select: (ids: string[]) => void,
) {
  const { setCenter, getZoom } = useReactFlow()
  const waiting = useAttention((s) => s.waiting)

  const ordered = [...nodes].sort(
    (a, b) => a.position.y - b.position.y || a.position.x - b.position.x,
  )
  const current = ordered.findIndex((node) => node.selected)

  const focus = (node: CanvasFlowNode | undefined): void => {
    if (!node) return
    const width = node.width ?? node.measured?.width ?? 0
    const height = node.height ?? node.measured?.height ?? 0
    void setCenter(node.position.x + width / 2, node.position.y + height / 2, {
      zoom: Math.max(getZoom(), FOCUS_ZOOM),
      duration: 350,
    })
    select([node.id])
  }

  const step = (by: 1 | -1): void => {
    if (ordered.length === 0) return
    const from = current === -1 ? (by === 1 ? -1 : 0) : current
    focus(ordered[(from + by + ordered.length) % ordered.length])
  }

  /** The next waiting agent after the selected node, wrapping around. */
  const nextWaiting = (): void => {
    const agents = ordered.filter((n) => n.type === 'agent' && waiting[sessionKey(projectId, n.id)])
    const after = agents.find((n) => ordered.indexOf(n) > current)
    focus(after ?? agents[0])
  }

  return {
    next: () => step(1),
    previous: () => step(-1),
    nextWaiting,
    /** The single selected node, if exactly one is. */
    single: nodes.filter((n) => n.selected).length === 1 ? ordered[current]?.id : undefined,
  }
}
