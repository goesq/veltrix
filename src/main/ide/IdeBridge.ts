import { randomBytes, timingSafeEqual } from 'node:crypto'
import { existsSync, unlinkSync } from 'node:fs'
import { mkdir, rename, writeFile } from 'node:fs/promises'
import { createServer, type Server, type Socket } from 'node:net'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Project } from '@shared/types'
import type { Orchestrator } from '../orchestrator/Orchestrator'
import type { ProjectRepository } from '../projects/ProjectRepository'
import {
  BRIDGE_VERSION,
  BridgeRequestSchema,
  type BridgeDiscovery,
  type BridgeEvent,
  type BridgeRequest,
  type BridgeResponse,
} from './protocol'

/** Longest request line accepted; the bridge only receives short commands. */
const MAX_REQUEST_CHARS = 128_000
/** A client that doesn't say hello this fast is not an IDE. */
const HELLO_TIMEOUT_MS = 5000
/** Quiet this long after real output counts as a live agent waiting for the user. */
const QUIET_MS = 4000
/** Less output than this since the user's last input is just echo or a cursor blink. */
const MIN_OUTPUT_CHARS = 80

/** Where IDEs look for the running app: the same place whatever the OS or the data folder. */
export const discoveryFile = (): string => join(homedir(), '.veltrix', 'ide-bridge.json')

/**
 * A local socket for Veltrix IDE: lists projects, sends goals, retries tasks and streams
 * changes and task output. Clients find it through a discovery file holding the socket
 * address and a secret token created at every launch.
 */
export class IdeBridge {
  private readonly token = randomBytes(24).toString('hex')
  private readonly socketPath: string
  private readonly clients = new Set<Socket>()
  private server: Server | undefined
  private readonly offProjects: (() => void)[] = []

  /** Live agents' output since the user last typed, and the timers that mark them waiting. */
  private readonly outputChars = new Map<string, number>()
  private readonly quietTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private readonly waiting = new Map<string, Set<string>>()

  constructor(
    private readonly projects: ProjectRepository,
    private readonly orchestrator: Orchestrator,
    private readonly app: { name: string; version: string },
  ) {
    const name = `veltrix-ide-${process.pid}-${randomBytes(4).toString('hex')}`
    this.socketPath =
      process.platform === 'win32' ? `\\\\.\\pipe\\${name}` : join(tmpdir(), `${name}.sock`)
  }

  async start(): Promise<void> {
    this.removeSocketFile()
    const server = createServer((socket) => this.accept(socket))
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(this.socketPath, resolve)
    })
    this.server = server
    this.offProjects.push(
      this.projects.onChange((project) => this.broadcast({ event: 'project', project })),
      this.projects.onRemove((projectId) => this.broadcast({ event: 'projectRemoved', projectId })),
    )
    await this.writeDiscovery()
  }

  stop(): void {
    for (const off of this.offProjects) off()
    for (const timer of this.quietTimers.values()) clearTimeout(timer)
    for (const client of this.clients) client.destroy()
    this.server?.close()
    this.removeSocketFile()
    // Left behind, the file would send IDEs to a socket nobody listens on.
    try {
      unlinkSync(discoveryFile())
    } catch {
      /* already gone */
    }
  }

  /** Task output from the orchestrator, for IDEs following a task. */
  taskOutput(event: { projectId: string; taskId: string; runStartedAt: number; data: string }): void {
    this.broadcast({ event: 'taskOutput', ...event })
  }

  /** A live agent printed something. */
  liveData(projectId: string, agentId: string, data: string): void {
    const key = `${projectId}:${agentId}`
    this.outputChars.set(key, (this.outputChars.get(key) ?? 0) + data.length)
    this.setWaiting(projectId, agentId, false)
    clearTimeout(this.quietTimers.get(key))
    this.quietTimers.set(
      key,
      setTimeout(() => {
        if ((this.outputChars.get(key) ?? 0) >= MIN_OUTPUT_CHARS) {
          this.setWaiting(projectId, agentId, true)
        }
      }, QUIET_MS),
    )
  }

  /** A live agent session ended. */
  liveExit(projectId: string, agentId: string): void {
    const key = `${projectId}:${agentId}`
    clearTimeout(this.quietTimers.get(key))
    this.quietTimers.delete(key)
    this.outputChars.delete(key)
    this.setWaiting(projectId, agentId, false)
  }

  private setWaiting(projectId: string, agentId: string, waiting: boolean): void {
    const set = this.waiting.get(projectId) ?? new Set<string>()
    if (set.has(agentId) === waiting) return
    if (waiting) set.add(agentId)
    else set.delete(agentId)
    this.waiting.set(projectId, set)
    this.broadcast({ event: 'waiting', projectId, agentIds: [...set] })
  }

  private async writeDiscovery(): Promise<void> {
    const file = discoveryFile()
    const discovery: BridgeDiscovery = {
      version: BRIDGE_VERSION,
      pid: process.pid,
      socket: this.socketPath,
      token: this.token,
      app: this.app,
    }
    await mkdir(join(file, '..'), { recursive: true })
    // Written aside and renamed, so a client never reads half a file.
    const temp = `${file}.${process.pid}.tmp`
    await writeFile(temp, JSON.stringify(discovery), { mode: 0o600 })
    await rename(temp, file)
  }

  private accept(socket: Socket): void {
    let input = ''
    let authenticated = false
    socket.setEncoding('utf8')
    const hello = setTimeout(() => {
      if (!authenticated) socket.destroy()
    }, HELLO_TIMEOUT_MS)
    socket.on('error', () => socket.destroy())
    socket.on('close', () => {
      clearTimeout(hello)
      this.clients.delete(socket)
    })
    socket.on('data', (chunk: string) => {
      input += chunk
      if (input.length > MAX_REQUEST_CHARS) return socket.destroy()
      let end = input.indexOf('\n')
      while (end >= 0) {
        const line = input.slice(0, end)
        input = input.slice(end + 1)
        end = input.indexOf('\n')
        if (!line.trim()) continue
        void this.receive(socket, line, authenticated).then((ok) => {
          if (ok && !authenticated) {
            authenticated = true
            clearTimeout(hello)
            this.clients.add(socket)
          }
        })
      }
    })
  }

  /** Handles one line; resolves true when it authenticated the client. */
  private async receive(socket: Socket, line: string, authenticated: boolean): Promise<boolean> {
    let request: BridgeRequest
    try {
      request = BridgeRequestSchema.parse(JSON.parse(line))
    } catch {
      this.reply(socket, { id: -1, ok: false, error: 'Malformed request.' })
      if (!authenticated) socket.destroy()
      return false
    }

    if (request.op === 'hello') {
      if (!sameToken(request.token, this.token)) {
        this.reply(socket, { id: request.id, ok: false, error: 'Wrong token.' })
        socket.destroy()
        return false
      }
      this.reply(socket, {
        id: request.id,
        ok: true,
        data: { version: BRIDGE_VERSION, app: this.app },
      })
      return true
    }
    if (!authenticated) {
      socket.destroy()
      return false
    }
    try {
      this.reply(socket, { id: request.id, ok: true, data: await this.handle(request) })
    } catch (error) {
      this.reply(socket, {
        id: request.id,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
    return false
  }

  private async handle(request: Exclude<BridgeRequest, { op: 'hello' }>): Promise<unknown> {
    switch (request.op) {
      case 'projects':
        return {
          projects: this.projects.list() satisfies Project[],
          waiting: Object.fromEntries(
            [...this.waiting].map(([projectId, agents]) => [projectId, [...agents]]),
          ),
        }
      case 'submit': {
        if (!request.prompt.trim()) throw new Error('Describe what the agents should do.')
        this.projects.get(request.projectId)
        // Planning can take a while; the goal shows up through `project` events.
        void this.orchestrator.submit(request.projectId, request.prompt).catch(() => undefined)
        return null
      }
      case 'retry':
        this.orchestrator.retryTask(request.projectId, request.taskId)
        return null
      case 'cancel':
        this.orchestrator.cancelTask(request.projectId, request.taskId)
        return null
      case 'taskLog':
        return await this.orchestrator.taskLog(request.projectId, request.taskId)
    }
  }

  private reply(socket: Socket, response: BridgeResponse): void {
    if (!socket.destroyed) socket.write(`${JSON.stringify(response)}\n`)
  }

  private broadcast(event: BridgeEvent): void {
    if (this.clients.size === 0) return
    const line = `${JSON.stringify(event)}\n`
    for (const client of this.clients) if (!client.destroyed) client.write(line)
  }

  /** A stale socket file from a crashed run would block `listen` (macOS / Linux only). */
  private removeSocketFile(): void {
    if (process.platform !== 'win32' && existsSync(this.socketPath)) unlinkSync(this.socketPath)
  }
}

function sameToken(given: string, expected: string): boolean {
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}
