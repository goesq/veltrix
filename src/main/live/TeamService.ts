import { AGENT_TOOL_IDS, AGENT_TOOLS, type AgentTool } from '@shared/ai'
import { AGENT_COLORS, type Agent, type LiveSessionInfo, type Project } from '@shared/types'
import { isOnPath } from '../infra/shell'
import type { ProjectRepository } from '../projects/ProjectRepository'
import { SEND_COMMAND } from './liveBrief'
import type { SendResponse } from './protocol'

/** What the team needs from the live sessions: start a recruit, stop a dismissed one. */
export interface LiveSessions {
  start(project: Project, agent: Agent, cols: number, rows: number): Promise<LiveSessionInfo>
  stop(projectId: string, agentId: string): void
}

/** A manager can't grow its team past this; it keeps the canvas (and the bill) sane. */
const MAX_RECRUITS = 6
/** Size of a recruit's terminal until its node on the canvas measures itself. */
const START_COLS = 100
const START_ROWS = 30

/**
 * Lets a manager agent assemble its own team on the canvas, like a lead: recruit an agent
 * for a role (it appears below the manager, linked both ways, and starts at once) and
 * dismiss it when its work is done.
 */
export class TeamService {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly sessions: LiveSessions,
  ) {}

  async recruit(
    project: Project,
    manager: Agent,
    name: string,
    role: string,
    tool?: string,
  ): Promise<SendResponse> {
    if (!manager.manager) {
      return {
        ok: false,
        error: 'Only manager agents can recruit. The user can make you one on the canvas.',
      }
    }
    const team = project.agents.filter((a) => a.recruitedBy === manager.id)
    if (team.length >= MAX_RECRUITS) {
      return { ok: false, error: `You already lead ${team.length} agents. Dismiss one first.` }
    }
    const provider = pickTool(tool, manager)
    if (!provider) {
      const installed = AGENT_TOOL_IDS.filter((id) => isOnPath(AGENT_TOOLS[id].binary))
      return {
        ok: false,
        error: `"${tool}" is not an installed agent CLI. Use one of: ${installed.join(', ')}.`,
      }
    }

    const recruit = this.projects.addRecruit(
      project.id,
      {
        name: uniqueName(
          cleanName(name),
          project.agents.map((a) => a.name),
        ),
        role: role.trim(),
        provider,
        livePermission: manager.livePermission,
        color: AGENT_COLORS[project.agents.length % AGENT_COLORS.length],
      },
      manager.id,
    )
    try {
      await this.sessions.start(this.projects.get(project.id), recruit, START_COLS, START_ROWS)
    } catch (error) {
      return {
        ok: false,
        error: `Recruited ${recruit.name}, but it could not start: ${errorMessage(error)}`,
      }
    }
    return {
      ok: true,
      text:
        `Recruited ${recruit.name} (${recruit.role}, ${AGENT_TOOLS[provider].name}). It is starting below you on the canvas, ` +
        `linked both ways. Give it about 15 seconds, then send its task: ${SEND_COMMAND} ${quote(recruit.name)} "..."`,
    }
  }

  dismiss(project: Project, manager: Agent, name: string): SendResponse {
    const wanted = name.trim().toLowerCase()
    const recruit = project.agents.find(
      (a) => a.name.trim().toLowerCase() === wanted || a.id === name,
    )
    if (!recruit) return { ok: false, error: `No agent called "${name}".` }
    if (recruit.recruitedBy !== manager.id) {
      return {
        ok: false,
        error: `${recruit.name} is not one of your recruits; only the user can remove it.`,
      }
    }
    this.sessions.stop(project.id, recruit.id)
    this.projects.removeAgent(project.id, recruit.id)
    return { ok: true, text: `Dismissed ${recruit.name}.` }
  }
}

/** The CLI asked for if it is installed; otherwise the manager's own (one toolchain). */
function pickTool(asked: string | undefined, manager: Agent): AgentTool | undefined {
  if (asked) {
    const tool = AGENT_TOOL_IDS.find(
      (id) => id === asked.toLowerCase() || AGENT_TOOLS[id].binary === asked,
    )
    return tool && isOnPath(AGENT_TOOLS[tool].binary) ? tool : undefined
  }
  return manager.provider === 'custom' ? 'claude' : manager.provider
}

/** Names are typed in shells by other agents: keep them short and plain. */
function cleanName(name: string): string {
  return (
    name
      .trim()
      .replace(/[^\p{L}\p{N}_-]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32) || 'agent'
  )
}

function uniqueName(name: string, taken: string[]): string {
  const used = new Set(taken.map((n) => n.trim().toLowerCase()))
  if (!used.has(name.toLowerCase())) return name
  let n = 2
  while (used.has(`${name}-${n}`.toLowerCase())) n++
  return `${name}-${n}`
}

const quote = (name: string): string => (/\s/.test(name) ? `"${name}"` : name)

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
