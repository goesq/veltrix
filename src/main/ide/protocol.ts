import { z } from 'zod/v4'
import { AGENT_TOOL_IDS } from '@shared/ai'
import { AGENT_COLORS, NOTE_COLORS, type CanvasMessage, type LiveSessionInfo } from '@shared/types'

/**
 * The IDE bridge: how Veltrix IDE (or any other client) drives this app. One JSON object per
 * line in both directions over a local socket. The first line a client sends must be `hello`
 * with the token from the discovery file; after that it gets every event below and may send
 * requests, each answered with a response carrying the same `id`.
 *
 * Version 2 added the canvas: saving it, notes, messages between agents and live agent
 * sessions. A client reads the version from the discovery file (and from the answer to
 * `hello`) and must not send an op the app's version doesn't have: it is refused as malformed.
 */
export const BRIDGE_VERSION = 2

const box = { x: z.number(), y: z.number(), width: z.number(), height: z.number() }

/** A whole canvas, as the app's own window saves it. */
const CanvasSchema = z.object({
  nodes: z.array(z.object({ agentId: z.string(), ...box })),
  notes: z
    .array(
      z.object({
        id: z.string(),
        ...box,
        color: z.enum(NOTE_COLORS),
        title: z.string().optional(),
        locked: z.boolean().optional(),
      }),
    )
    .optional(),
  texts: z.array(z.object({ id: z.string(), ...box, text: z.string() })).optional(),
  portals: z
    .array(z.object({ id: z.string(), ...box, url: z.string(), title: z.string().optional() }))
    .optional(),
  edges: z.array(
    z.object({ id: z.string(), from: z.string(), to: z.string(), paused: z.boolean().optional() }),
  ),
})

const id = z.number()
const projectId = z.string()
const agentId = z.string()
const size = { cols: z.number().int(), rows: z.number().int() }

export const BridgeRequestSchema = z.discriminatedUnion('op', [
  z.object({ id, op: z.literal('hello'), token: z.string() }),
  z.object({ id, op: z.literal('projects') }),
  z.object({ id, op: z.literal('submit'), projectId, prompt: z.string() }),
  z.object({ id, op: z.literal('retry'), projectId, taskId: z.string() }),
  z.object({ id, op: z.literal('cancel'), projectId, taskId: z.string() }),
  z.object({ id, op: z.literal('taskLog'), projectId, taskId: z.string() }),

  // Canvas (version 2). The saved canvas itself travels inside `project` events.
  z.object({ id, op: z.literal('canvasSave'), projectId, canvas: CanvasSchema }),
  z.object({
    id,
    op: z.literal('canvasSetEdgePaused'),
    projectId,
    edgeId: z.string(),
    paused: z.boolean(),
  }),
  z.object({ id, op: z.literal('canvasMessages'), projectId }),
  z.object({ id, op: z.literal('noteRead'), projectId, noteId: z.string() }),
  z.object({ id, op: z.literal('noteWrite'), projectId, noteId: z.string(), content: z.string() }),

  // Live agent sessions (version 2).
  // Turns the `liveData` stream of a project's agents on or off for this client.
  z.object({ id, op: z.literal('liveSubscribe'), projectId, on: z.boolean() }),
  z.object({ id, op: z.literal('liveList'), projectId }),
  z.object({ id, op: z.literal('liveStart'), projectId, agentId, ...size }),
  z.object({ id, op: z.literal('liveStop'), projectId, agentId }),
  z.object({ id, op: z.literal('liveWrite'), projectId, agentId, data: z.string() }),
  z.object({ id, op: z.literal('liveResize'), projectId, agentId, ...size }),
  // The end of what the session printed so far, to fill a terminal that just opened.
  z.object({ id, op: z.literal('liveBuffer'), projectId, agentId }),

  // Agents, as the canvas creates and adjusts them (version 2).
  // A new agent running one of the known CLIs; resolves to the agent.
  z.object({
    id,
    op: z.literal('agentCreate'),
    projectId,
    name: z.string().min(1).max(80),
    provider: z.enum(AGENT_TOOL_IDS as [string, ...string[]]),
    color: z.enum(AGENT_COLORS),
  }),
  // Only the fields given change; everything else about the agent stays as it is.
  z.object({
    id,
    op: z.literal('agentUpdate'),
    projectId,
    agentId,
    livePermission: z.enum(['ask', 'acceptEdits']).optional(),
    manager: z.boolean().optional(),
  }),
])

export type BridgeRequest = z.infer<typeof BridgeRequestSchema>

export type BridgeResponse =
  { id: number; ok: true; data: unknown } | { id: number; ok: false; error: string }

/** Pushed to every connected client, except `liveData` (see `liveSubscribe`). */
export type BridgeEvent =
  | { event: 'project'; project: unknown }
  | { event: 'projectRemoved'; projectId: string }
  | { event: 'taskOutput'; projectId: string; taskId: string; runStartedAt: number; data: string }
  /** Live agents of a project that are waiting for the user to answer. */
  | { event: 'waiting'; projectId: string; agentIds: string[] }
  | { event: 'liveStarted'; session: LiveSessionInfo }
  | { event: 'liveExit'; session: LiveSessionInfo }
  /** Only for clients that subscribed to the project. */
  | { event: 'liveData'; projectId: string; agentId: string; data: string }
  /** A message one live agent sent another (or tried to). */
  | { event: 'canvasMessage'; message: CanvasMessage }

/** What the discovery file holds. */
export interface BridgeDiscovery {
  version: number
  pid: number
  /** Named pipe (Windows) or unix socket path. */
  socket: string
  token: string
  app: { name: string; version: string }
}
