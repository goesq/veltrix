import { z } from 'zod/v4'

/** What `veltrix-send` asks, one JSON line per connection. */
export const SendRequestSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('peers') }),
  z.object({ op: z.literal('send'), to: z.string(), text: z.string() }),
  // Manager agents only: grow or shrink their team on the canvas.
  z.object({
    op: z.literal('recruit'),
    name: z.string(),
    role: z.string(),
    tool: z.string().optional(),
  }),
  z.object({ op: z.literal('dismiss'), name: z.string() }),
  // Drive a browser portal linked on the canvas.
  z.object({
    op: z.literal('browser'),
    action: z.string(),
    args: z.array(z.string()),
    portal: z.string().optional(),
  }),
])

export type SendRequest = z.infer<typeof SendRequestSchema>

export type SendResponse = { ok: true; text: string } | { ok: false; error: string }

/** The live session a request came from, as identified by its token. */
export interface Sender {
  projectId: string
  agentId: string
}

export type SendRequestHandler = (sender: Sender, request: SendRequest) => Promise<SendResponse>
