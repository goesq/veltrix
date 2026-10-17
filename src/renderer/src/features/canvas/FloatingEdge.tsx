import {
  BaseEdge,
  getBezierPath,
  Position,
  useInternalNode,
  type EdgeProps,
  type InternalNode,
  type XYPosition,
} from '@xyflow/react'

/**
 * A line that leaves and enters each node on the side facing the other one, wherever the
 * two are, instead of always from the right handle to the left one.
 */
export function FloatingEdge({ id, source, target, markerEnd, style }: EdgeProps) {
  const from = useInternalNode(source)
  const to = useInternalNode(target)
  if (!from || !to) return null

  const start = borderPoint(from, to)
  const end = borderPoint(to, from)
  const [path] = getBezierPath({
    sourceX: start.x,
    sourceY: start.y,
    sourcePosition: sideOf(from, start),
    targetX: end.x,
    targetY: end.y,
    targetPosition: sideOf(to, end),
  })
  return <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />
}

function box(node: InternalNode) {
  const { x, y } = node.internals.positionAbsolute
  return { x, y, width: node.measured.width ?? 0, height: node.measured.height ?? 0 }
}

/** Where the line from the centre of `node` to the centre of `other` crosses `node`'s border. */
function borderPoint(node: InternalNode, other: InternalNode): XYPosition {
  const a = box(node)
  const b = box(other)
  const halfW = a.width / 2
  const halfH = a.height / 2
  const cx = a.x + halfW
  const cy = a.y + halfH
  const dx = b.x + b.width / 2 - cx
  const dy = b.y + b.height / 2 - cy
  if ((dx === 0 && dy === 0) || halfW === 0 || halfH === 0) return { x: cx, y: cy }
  // Scale the direction until it touches the nearer pair of sides.
  const scale = Math.min(halfW / Math.abs(dx || Infinity), halfH / Math.abs(dy || Infinity))
  return { x: cx + dx * scale, y: cy + dy * scale }
}

/** Which side of `node` a point on its border is on, so the curve leaves it straight. */
function sideOf(node: InternalNode, point: XYPosition): Position {
  const { x, y, width } = box(node)
  const near = (a: number, b: number): boolean => Math.abs(a - b) < 1
  if (near(point.x, x)) return Position.Left
  if (near(point.x, x + width)) return Position.Right
  if (near(point.y, y)) return Position.Top
  return Position.Bottom
}
