import * as pty from 'node-pty'
import { AGENT_TOOLS, PROMPT_PLACEHOLDER } from '@shared/ai'
import type { Agent, LiveSessionInfo, Project } from '@shared/types'
import { childEnv, prependToPath } from '../infra/environment'
import { loadLoginShellPath } from '../infra/loginShellPath'
import { commandShell } from '../infra/shell'
import { ProjectWorkspace } from '../projects/ProjectWorkspace'
import { buildLiveBrief, liveOpening } from './liveBrief'

export interface LiveSessionEvents {
  onData(projectId: string, agentId: string, data: string): void
  onExit(info: LiveSessionInfo): void
}

/** Where agents find `veltrix-send` and how it reaches Veltrix. */
export interface SendChannel {
  binDir: string
  socketPath: string
  /** A secret for one session: it identifies the sender of each message. */
  issueToken(projectId: string, agentId: string): string
  revokeToken(token: string): void
}

/** Output kept per session, so a node can remount its terminal or show a preview. */
const BUFFER_CHARS = 200_000
/** Live sessions across all projects. Each one is a full agent CLI. */
export const MAX_LIVE_SESSIONS = 16
/** For CLIs that can't take an opening prompt: paste it once output has been quiet this long. */
const OPENING_QUIET_MS = 2500
/** Bracketed paste, so multi-line text arrives as one input instead of several submits. */
const PASTE_START = '\x1b[200~'
const PASTE_END = '\x1b[201~'
/** Pause between pasting and pressing Enter, so the TUI has taken the paste in. */
const SUBMIT_DELAY_MS = 120

interface LiveSession {
  projectId: string
  agentId: string
  process: pty.IPty
  buffer: string
  token: string
}

/** Interactive agent sessions shown as nodes on a project's canvas. */
export class LiveSessionService {
  private readonly sessions = new Map<string, LiveSession>()

  constructor(
    private readonly channel: SendChannel,
    private readonly events: LiveSessionEvents,
  ) {}

  list(projectId: string): LiveSessionInfo[] {
    return [...this.sessions.values()]
      .filter((s) => s.projectId === projectId)
      .map((s) => ({ projectId: s.projectId, agentId: s.agentId, status: 'running' }))
  }

  isRunning(projectId: string, agentId: string): boolean {
    return this.sessions.has(key(projectId, agentId))
  }

  async start(
    project: Project,
    agent: Agent,
    cols: number,
    rows: number,
  ): Promise<LiveSessionInfo> {
    const id = key(project.id, agent.id)
    if (this.sessions.has(id))
      return { projectId: project.id, agentId: agent.id, status: 'running' }
    if (this.sessions.size >= MAX_LIVE_SESSIONS) {
      throw new Error(`You can have at most ${MAX_LIVE_SESSIONS} live agents running.`)
    }
    if (agent.provider === 'custom') {
      throw new Error('Live sessions need one of the known agent CLIs, not a custom command.')
    }

    const workspace = new ProjectWorkspace(project)
    await workspace.readContext(agent.id) // Creates the context file from its template if needed.
    const briefPath = await workspace.writeLiveBrief(
      agent.id,
      buildLiveBrief({
        agent,
        projectName: project.name,
        contextFile: workspace.contextFile(agent.id).path,
      }),
    )

    const shell = commandShell()
    const template = AGENT_TOOLS[agent.provider].live[agent.livePermission ?? 'ask']
    const opening = liveOpening(agent, briefPath)
    const takesPrompt = template.includes(PROMPT_PLACEHOLDER)
    const commandLine = template.replaceAll(PROMPT_PLACEHOLDER, shell.quote(opening))

    await loadLoginShellPath()
    const token = this.channel.issueToken(project.id, agent.id)
    const child = pty.spawn(shell.file, shell.commandArgs(commandLine), {
      name: 'xterm-256color',
      cols: Math.max(cols, 20),
      rows: Math.max(rows, 5),
      cwd: project.path,
      env: this.sessionEnv(token),
    })
    const session: LiveSession = {
      projectId: project.id,
      agentId: agent.id,
      process: child,
      buffer: '',
      token,
    }
    this.sessions.set(id, session)

    // CLIs without an opening-prompt flag get it pasted once their startup output settles.
    let openingPending = !takesPrompt
    let openingTimer: ReturnType<typeof setTimeout> | undefined
    child.onData((data) => {
      session.buffer = (session.buffer + data).slice(-BUFFER_CHARS)
      this.events.onData(project.id, agent.id, data)
      if (!openingPending) return
      clearTimeout(openingTimer)
      openingTimer = setTimeout(() => {
        openingPending = false
        this.paste(project.id, agent.id, opening)
      }, OPENING_QUIET_MS)
    })

    child.onExit(({ exitCode }) => {
      clearTimeout(openingTimer)
      this.channel.revokeToken(token)
      if (this.sessions.get(id) === session) this.sessions.delete(id)
      this.events.onExit({ projectId: project.id, agentId: agent.id, status: 'exited', exitCode })
    })
    return { projectId: project.id, agentId: agent.id, status: 'running' }
  }

  buffer(projectId: string, agentId: string): string {
    return this.sessions.get(key(projectId, agentId))?.buffer ?? ''
  }

  write(projectId: string, agentId: string, data: string): void {
    this.sessions.get(key(projectId, agentId))?.process.write(data)
  }

  resize(projectId: string, agentId: string, cols: number, rows: number): void {
    if (cols < 1 || rows < 1) return
    this.sessions.get(key(projectId, agentId))?.process.resize(cols, rows)
  }

  /** Types text into an agent's session as one paste, then submits it. */
  paste(projectId: string, agentId: string, text: string): boolean {
    const session = this.sessions.get(key(projectId, agentId))
    if (!session) return false
    session.process.write(`${PASTE_START}${text}${PASTE_END}`)
    setTimeout(() => session.process.write('\r'), SUBMIT_DELAY_MS)
    return true
  }

  stop(projectId: string, agentId: string): void {
    const session = this.sessions.get(key(projectId, agentId))
    if (!session) return
    this.sessions.delete(key(projectId, agentId))
    this.channel.revokeToken(session.token)
    session.process.kill()
  }

  stopProject(projectId: string): void {
    for (const session of [...this.sessions.values()]) {
      if (session.projectId === projectId) this.stop(projectId, session.agentId)
    }
  }

  stopAll(): void {
    for (const session of [...this.sessions.values()]) this.stop(session.projectId, session.agentId)
  }

  private sessionEnv(token: string): Record<string, string> {
    const env = childEnv()
    prependToPath(env, this.channel.binDir)
    env.VELTRIX_SOCKET = this.channel.socketPath
    env.VELTRIX_TOKEN = token
    // `veltrix-send` runs on the Electron binary in Node mode; no separate Node install needed.
    env.VELTRIX_NODE = process.execPath
    return env
  }
}

const key = (projectId: string, agentId: string): string => `${projectId}:${agentId}`
