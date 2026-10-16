import { createWriteStream, existsSync, type WriteStream } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, sep } from 'node:path'
import { PROJECT_WORKSPACE_DIR } from '@shared/constants'
import { DEFAULT_PROJECT_CONTEXT, type Agent, type Project } from '@shared/types'

const CONTEXT_TEMPLATE = `# Project context

Shared context for every agent working on this project. Describe the stack,
conventions, constraints and anything an agent should know before touching code.

## Notes from agents

<!-- Agents append durable learnings below. -->
`

const agentContextTemplate = (agent: Agent): string => `# Context for ${agent.name}

What ${agent.name} should know before working on this project: the parts of the code it owns, conventions, constraints and gotchas. Only this agent reads this file.

## Notes

<!-- The agent appends durable learnings below. -->
`

/** A context file: the path agents are given, and where it is on disk. */
export interface ContextFile {
  /** Relative to the project folder when inside it (as written in prompts), else absolute. */
  path: string
  absolute: string
  /** Created from a template the first time it is read; files the user picked are not. */
  template?: string
}

/**
 * The `.veltrix/` folder inside a project: the shared context file that every agent reads,
 * one brief per task and the raw output log of each task run.
 */
export class ProjectWorkspace {
  constructor(private readonly project: Pick<Project, 'path' | 'context' | 'agents'>) {}

  get root(): string {
    return join(this.project.path, PROJECT_WORKSPACE_DIR)
  }

  /** Path of a task brief, relative to the project root (used inside agent prompts). */
  briefRelativePath(taskId: string): string {
    return `${PROJECT_WORKSPACE_DIR}/tasks/${taskId}.md`
  }

  async ensure(): Promise<void> {
    await mkdir(join(this.root, 'tasks'), { recursive: true })
    await mkdir(join(this.root, 'logs'), { recursive: true })
  }

  /**
   * The context file an agent reads: the project's shared one, or, when the project keeps
   * one context per agent, that agent's own. `agentId` is required in per-agent mode.
   */
  contextFile(agentId?: string): ContextFile {
    const context = this.project.context ?? DEFAULT_PROJECT_CONTEXT
    if (context.scope === 'perAgent') {
      const agent = this.project.agents.find((a) => a.id === agentId)
      if (!agent) throw new Error('This project keeps one context per agent: pick an agent.')
      const chosen = agent.contextFile?.trim()
      return chosen
        ? this.resolve(chosen)
        : {
            ...this.resolve(`${PROJECT_WORKSPACE_DIR}/agents/${agent.id}.md`),
            template: agentContextTemplate(agent),
          }
    }
    if (context.source === 'claudeMd') return this.resolve('CLAUDE.md')
    if (context.source === 'file') return this.resolve(context.file)
    return { ...this.resolve(`${PROJECT_WORKSPACE_DIR}/CONTEXT.md`), template: CONTEXT_TEMPLATE }
  }

  /** Contents of a context file; empty when a picked file doesn't exist yet. */
  async readContext(agentId?: string): Promise<string> {
    const file = this.contextFile(agentId)
    if (existsSync(file.absolute)) return readFile(file.absolute, 'utf8')
    if (!file.template) return ''
    await this.writeFile(file.absolute, file.template)
    return file.template
  }

  async writeContext(content: string, agentId?: string): Promise<void> {
    await this.writeFile(this.contextFile(agentId).absolute, content)
  }

  /** What the planner reads: the shared context, or every agent's own under its name. */
  async plannerContext(): Promise<string> {
    if (this.project.context?.scope !== 'perAgent') return this.readContext()
    const sections = await Promise.all(
      this.project.agents.map(
        async (agent) =>
          `## Context of ${agent.name} (${agent.id})\n\n${await this.readContext(agent.id)}`,
      ),
    )
    return sections.join('\n\n')
  }

  /** A path as stored in settings: relative to the project when inside it, else absolute. */
  projectPath(absolute: string): string {
    const inside = relative(this.project.path, absolute)
    if (!inside || inside.startsWith('..') || isAbsolute(inside)) return absolute
    return inside.split(sep).join('/')
  }

  private resolve(path: string): ContextFile {
    const absolute = isAbsolute(path) ? path : join(this.project.path, path)
    return { path: this.projectPath(absolute), absolute }
  }

  private async writeFile(absolute: string, content: string): Promise<void> {
    await mkdir(dirname(absolute), { recursive: true })
    await writeFile(absolute, content, 'utf8')
  }

  async writeBrief(taskId: string, content: string): Promise<void> {
    await this.ensure()
    await writeFile(join(this.project.path, this.briefRelativePath(taskId)), content, 'utf8')
  }

  /** Opens (truncating) the output log of a task run. Writes through a stream keep chunk order. */
  async openLog(taskId: string): Promise<WriteStream> {
    await this.ensure()
    return createWriteStream(this.logFile(taskId), { flags: 'w', encoding: 'utf8' })
  }

  async readLog(taskId: string): Promise<string> {
    const file = this.logFile(taskId)
    return existsSync(file) ? readFile(file, 'utf8') : ''
  }

  private logFile(taskId: string): string {
    return join(this.root, 'logs', `${taskId}.log`)
  }
}
