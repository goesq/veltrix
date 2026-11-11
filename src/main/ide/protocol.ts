import { z } from 'zod/v4'

/**
 * The IDE bridge: how Veltrix IDE (or any other client) drives this app. One JSON object per
 * line in both directions over a local socket. The first line a client sends must be `hello`
 * with the token from the discovery file; after that it gets every event below and may send
 * requests, each answered with a response carrying the same `id`.
 */
export const BRIDGE_VERSION = 1

export const BridgeRequestSchema = z.discriminatedUnion('op', [
  z.object({ id: z.number(), op: z.literal('hello'), token: z.string() }),
  z.object({ id: z.number(), op: z.literal('projects') }),
  z.object({ id: z.number(), op: z.literal('submit'), projectId: z.string(), prompt: z.string() }),
  z.object({ id: z.number(), op: z.literal('retry'), projectId: z.string(), taskId: z.string() }),
  z.object({ id: z.number(), op: z.literal('cancel'), projectId: z.string(), taskId: z.string() }),
  z.object({ id: z.number(), op: z.literal('taskLog'), projectId: z.string(), taskId: z.string() }),
])

export type BridgeRequest = z.infer<typeof BridgeRequestSchema>

export type BridgeResponse =
  | { id: number; ok: true; data: unknown }
  | { id: number; ok: false; error: string }

/** Pushed to every connected client; there is no subscription to ask for. */
export type BridgeEvent =
  | { event: 'project'; project: unknown }
  | { event: 'projectRemoved'; projectId: string }
  | { event: 'taskOutput'; projectId: string; taskId: string; runStartedAt: number; data: string }
  /** Live agents of a project that are waiting for the user to answer. */
  | { event: 'waiting'; projectId: string; agentIds: string[] }

/** What the discovery file holds. */
export interface BridgeDiscovery {
  version: number
  pid: number
  /** Named pipe (Windows) or unix socket path. */
  socket: string
  token: string
  app: { name: string; version: string }
}
