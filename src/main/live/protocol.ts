import { z } from 'zod/v4'

/** What `veltrix-send` asks, one JSON line per connection. */
export const SendRequestSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('peers') }),
  z.object({ op: z.literal('send'), to: z.string(), text: z.string() }),
])

export type SendRequest = z.infer<typeof SendRequestSchema>

export type SendResponse = { ok: true; text: string } | { ok: false; error: string }

/** The live session a request came from, as identified by its token. */
export interface Sender {
  projectId: string
  agentId: string
}

export type SendRequestHandler = (sender: Sender, request: SendRequest) => SendResponse
