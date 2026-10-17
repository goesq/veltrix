import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { Agent } from '@shared/types'
import type { ProjectRepository } from './ProjectRepository'

/** Whether an agent is busy (live session or task), so its folder can't change under it. */
export type AgentBusy = (projectId: string, agentId: string) => boolean

/**
 * Gives an agent its own copy of the project to work in: a git worktree on a branch of its
 * own (`veltrix/<agent name>`), so agents working at the same time never touch each
 * other's files. Worktrees live in the app's data folder, outside the project.
 */
export class WorktreeService {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly baseDir: string,
    private readonly busy: AgentBusy,
  ) {}

  async enable(projectId: string, agentId: string): Promise<Agent> {
    const { project, agent } = this.find(projectId, agentId)
    if (agent.worktree) return agent
    this.assertIdle(projectId, agent)
    await git(project.path, ['rev-parse', '--show-toplevel']).catch(() => {
      throw new Error(
        'This project is not a git repository, so agents cannot get their own worktree.',
      )
    })

    const branch = `veltrix/${slug(agent.name)}`
    const path = join(this.baseDir, projectId, agentId)
    await mkdir(join(this.baseDir, projectId), { recursive: true })
    await git(project.path, ['worktree', 'prune'])
    if (existsSync(path))
      throw new Error(`A folder is already at ${path}. Remove it and try again.`)
    const exists = await git(project.path, [
      'rev-parse',
      '--verify',
      '--quiet',
      `refs/heads/${branch}`,
    ]).then(
      () => true,
      () => false,
    )
    await git(
      project.path,
      exists ? ['worktree', 'add', path, branch] : ['worktree', 'add', '-b', branch, path],
    )
    return this.projects.setWorktree(projectId, agentId, { path, branch })
  }

  /** Removes the worktree (refused while it has uncommitted changes); the branch stays. */
  async disable(projectId: string, agentId: string): Promise<Agent> {
    const { project, agent } = this.find(projectId, agentId)
    if (!agent.worktree) return agent
    this.assertIdle(projectId, agent)
    if (existsSync(agent.worktree.path)) {
      await git(project.path, ['worktree', 'remove', agent.worktree.path]).catch((error: Error) => {
        throw new Error(
          /modified|untracked|changes/i.test(error.message)
            ? `${agent.name}'s worktree has uncommitted changes. Commit or discard them in ${agent.worktree!.path} first; its branch ${agent.worktree!.branch} stays either way.`
            : error.message,
        )
      })
    }
    await git(project.path, ['worktree', 'prune']).catch(() => undefined)
    return this.projects.setWorktree(projectId, agentId, undefined)
  }

  private find(projectId: string, agentId: string) {
    const project = this.projects.get(projectId)
    const agent = project.agents.find((a) => a.id === agentId)
    if (!agent) throw new Error('This agent was removed from the project.')
    return { project, agent }
  }

  private assertIdle(projectId: string, agent: Agent): void {
    if (this.busy(projectId, agent.id)) {
      throw new Error(`Stop ${agent.name} (and its running tasks) before changing where it works.`)
    }
  }
}

/** A branch-safe version of an agent's name. */
function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'agent'
  )
}

function git(cwd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd, windowsHide: true }, (error, stdout, stderr) => {
      if (error) reject(new Error(String(stderr || error.message).trim()))
      else resolve(String(stdout).trim())
    })
  })
}
