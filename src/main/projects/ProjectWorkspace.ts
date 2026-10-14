import { createWriteStream, existsSync, type WriteStream } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { PROJECT_WORKSPACE_DIR } from '@shared/constants'
import type { Project } from '@shared/types'

const CONTEXT_TEMPLATE = `# Project context

Shared context for every agent working on this project. Describe the stack,
conventions, constraints and anything an agent should know before touching code.

## Notes from agents

<!-- Agents append durable learnings below. -->
`

/**
 * The `.veltrix/` folder inside a project: the shared context file that every agent reads,
 * one brief per task and the raw output log of each task run.
 */
export class ProjectWorkspace {
  constructor(private readonly project: Pick<Project, 'path'>) {}

  get root(): string {
    return join(this.project.path, PROJECT_WORKSPACE_DIR)
  }

  get contextFile(): string {
    return join(this.root, 'CONTEXT.md')
  }

  /** Paths relative to the project root, as referenced inside agent prompts. */
  readonly contextRelativePath = `${PROJECT_WORKSPACE_DIR}/CONTEXT.md`

  /** Path of a task brief, relative to the project root (used inside agent prompts). */
  briefRelativePath(taskId: string): string {
    return `${PROJECT_WORKSPACE_DIR}/tasks/${taskId}.md`
  }

  async ensure(): Promise<void> {
    await mkdir(join(this.root, 'tasks'), { recursive: true })
    await mkdir(join(this.root, 'logs'), { recursive: true })
    if (!existsSync(this.contextFile)) await writeFile(this.contextFile, CONTEXT_TEMPLATE, 'utf8')
  }

  async readContext(): Promise<string> {
    await this.ensure()
    return readFile(this.contextFile, 'utf8')
  }

  async writeContext(content: string): Promise<void> {
    await this.ensure()
    await writeFile(this.contextFile, content, 'utf8')
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
