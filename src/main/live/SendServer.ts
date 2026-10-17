import { randomBytes } from 'node:crypto'
import { existsSync, unlinkSync } from 'node:fs'
import { createServer, type Server, type Socket } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { SendChannel } from './LiveSessionService'
import {
  SendRequestSchema,
  type Sender,
  type SendRequestHandler,
  type SendResponse,
} from './protocol'
import { installSendCommand } from './sendCli'

/** Longest request line accepted; anything bigger is not a real message. */
const MAX_REQUEST_CHARS = 64_000

/**
 * The local socket `veltrix-send` talks to. It only handles transport and identity: each
 * session gets a secret token, and a request is passed on with the session it came from.
 */
export class SendServer implements SendChannel {
  readonly socketPath: string
  readonly binDir: string
  private readonly tokens = new Map<string, Sender>()
  private server: Server | undefined
  private handle: SendRequestHandler | undefined

  constructor(dataDir: string) {
    this.binDir = join(dataDir, 'live-bin')
    const name = `veltrix-${process.pid}-${randomBytes(4).toString('hex')}`
    this.socketPath =
      process.platform === 'win32' ? `\\\\.\\pipe\\${name}` : join(tmpdir(), `${name}.sock`)
  }

  /** Installs `veltrix-send` and starts listening; `handle` answers each request. */
  async start(handle: SendRequestHandler): Promise<void> {
    this.handle = handle
    await installSendCommand(this.binDir)
    this.removeSocketFile()
    const server = createServer((socket) => this.serve(socket))
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(this.socketPath, resolve)
    })
    this.server = server
  }

  stop(): void {
    this.server?.close()
    this.removeSocketFile()
  }

  issueToken(projectId: string, agentId: string): string {
    const token = randomBytes(24).toString('hex')
    this.tokens.set(token, { projectId, agentId })
    return token
  }

  revokeToken(token: string): void {
    this.tokens.delete(token)
  }

  private serve(socket: Socket): void {
    let input = ''
    let answered = false
    socket.setEncoding('utf8')
    socket.on('error', () => socket.destroy())
    socket.on('data', (chunk) => {
      if (answered) return
      input += chunk
      const end = input.indexOf('\n')
      if (end >= 0) {
        answered = true
        void this.respond(input.slice(0, end)).then((response) => {
          if (!socket.destroyed) socket.end(JSON.stringify(response))
        })
      } else if (input.length > MAX_REQUEST_CHARS) socket.destroy()
    })
  }

  private async respond(line: string): Promise<SendResponse> {
    let parsed: unknown
    try {
      parsed = JSON.parse(line)
    } catch {
      return { ok: false, error: 'Malformed request.' }
    }
    const token = (parsed as { token?: unknown } | null)?.token
    const sender = typeof token === 'string' ? this.tokens.get(token) : undefined
    if (!sender) return { ok: false, error: 'This session is no longer connected to Veltrix.' }

    const request = SendRequestSchema.safeParse(parsed)
    if (!request.success || !this.handle) return { ok: false, error: 'Malformed request.' }
    try {
      return await this.handle(sender, request.data)
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  /** A stale socket file from a crashed run would block `listen` (macOS / Linux only). */
  private removeSocketFile(): void {
    if (process.platform !== 'win32' && existsSync(this.socketPath)) unlinkSync(this.socketPath)
  }
}
