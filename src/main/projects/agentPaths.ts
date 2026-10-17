import { isAbsolute, join } from 'node:path'
import type { Agent, Project } from '@shared/types'

/** Where an agent works: its own git worktree, or the project folder. */
export function agentCwd(project: Pick<Project, 'path'>, agent: Agent): string {
  return agent.worktree?.path ?? project.path
}

/**
 * A path as given to an agent. Paths inside the project (context, briefs, notes) stay
 * relative when the agent works in the project folder, and become absolute when it works in
 * its own worktree, where `.veltrix/` and the project's notes don't exist.
 */
export function pathForAgent(project: Pick<Project, 'path'>, agent: Agent, path: string): string {
  if (!agent.worktree || isAbsolute(path)) return path
  return join(project.path, path)
}
