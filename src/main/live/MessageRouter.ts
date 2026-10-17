import { canvasOf } from '@shared/canvas'
import type { Agent, Project } from '@shared/types'
import type { ProjectRepository } from '../projects/ProjectRepository'
import { linkedNotes } from './linkedNotes'
import { describeNotes, formatIncoming } from './liveBrief'
import type { MessageLog } from './MessageLog'
import type { Sender, SendRequest, SendResponse } from './protocol'
import { RateGuard } from './RateGuard'
import type { PortalService } from '../canvas/PortalService'
import type { TeamService } from './TeamService'

/** What the router needs from the live sessions to hand a message over. */
export interface MessageDelivery {
  isRunning(projectId: string, agentId: string): boolean
  paste(projectId: string, agentId: string, text: string): boolean
}

/** More than this many messages on one line in a minute pauses it (loop guard). */
const MESSAGES_PER_MINUTE = 8
const MAX_MESSAGE_CHARS = 8000

/**
 * Decides whether a message between live agents may pass: the receiver must exist, a line
 * must go from the sender to it, the line must not be paused and the receiver must be
 * running. Every attempt is logged, delivered or not.
 */
export class MessageRouter {
  private readonly guard = new RateGuard(MESSAGES_PER_MINUTE, 60_000)

  constructor(
    private readonly projects: ProjectRepository,
    private readonly delivery: MessageDelivery,
    private readonly log: MessageLog,
    private readonly team: TeamService,
    private readonly portals: PortalService,
  ) {}

  async handle(sender: Sender, request: SendRequest): Promise<SendResponse> {
    const project = this.projects.find(sender.projectId)
    const from = project?.agents.find((a) => a.id === sender.agentId)
    if (!project || !from) return { ok: false, error: 'Your agent is no longer in this project.' }

    if (request.op === 'send') return this.send(project, from, request.to, request.text)
    if (request.op === 'recruit') {
      return this.team.recruit(project, from, request.name, request.role, request.tool)
    }
    if (request.op === 'dismiss') return this.team.dismiss(project, from, request.name)
    if (request.op === 'browser') {
      return this.portals.run(project, from, request.action, request.args, request.portal)
    }
    const notes = await linkedNotes(project, from.id)
    const noteList = notes.length
      ? `Notes you can read and edit:\n${describeNotes(notes)}`
      : 'No notes are linked to you.'
    return {
      ok: true,
      text: `${describePeers(project, from)}\n${noteList}\n${this.portals.describe(project, from)}`,
    }
  }

  private send(project: Project, from: Agent, toName: string, rawText: string): SendResponse {
    const to = findAgent(project, toName)
    if (!to) {
      return { ok: false, error: `No agent called "${toName}". ${describePeers(project, from)}` }
    }

    const text = rawText.trim().slice(0, MAX_MESSAGE_CHARS)
    const refusal = this.refusal(project, from, to)
    if (refusal) {
      this.log.record({ projectId: project.id, from: from.id, to: to.id, text, error: refusal })
      return { ok: false, error: refusal }
    }

    this.delivery.paste(project.id, to.id, formatIncoming(from.name, text))
    this.log.record({ projectId: project.id, from: from.id, to: to.id, text })
    return { ok: true, text: `Delivered to ${to.name}.` }
  }

  /** Why a message from `from` to `to` can't go through right now, if it can't. */
  private refusal(project: Project, from: Agent, to: Agent): string | undefined {
    const line = canvasOf(project).edges.find((e) => e.from === from.id && e.to === to.id)
    if (!line) return `You are not connected to ${to.name}. ${describePeers(project, from)}`
    if (line.paused) return `The line to ${to.name} is paused by the user.`
    if (!this.delivery.isRunning(project.id, to.id)) return `${to.name} is not running right now.`
    if (this.guard.exceeded(line.id)) {
      this.projects.setEdgePaused(project.id, line.id, true)
      return `Too many messages to ${to.name} in a minute, so the line was paused. Wait for the user.`
    }
    return undefined
  }
}

function findAgent(project: Project, nameOrId: string): Agent | undefined {
  const wanted = nameOrId.trim().toLowerCase()
  return project.agents.find((a) => a.id === nameOrId || a.name.trim().toLowerCase() === wanted)
}

function describePeers(project: Project, agent: Agent): string {
  const { edges } = canvasOf(project)
  const nameOf = (id: string): string => project.agents.find((a) => a.id === id)?.name ?? id
  const names = (ids: string[]): string => (ids.length ? ids.map(nameOf).join(', ') : 'nobody yet')

  // Lines to notes and portals aren't message lines; those are listed on their own.
  const isAgent = (id: string): boolean => project.agents.some((a) => a.id === id)
  const canReach = edges
    .filter((e) => e.from === agent.id && !e.paused && isAgent(e.to))
    .map((e) => e.to)
  const reachedBy = edges.filter((e) => e.to === agent.id && isAgent(e.from)).map((e) => e.from)
  return `You can message: ${names(canReach)}. Can message you: ${names(reachedBy)}.`
}
