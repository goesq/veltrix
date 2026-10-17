import { AGENT_TOOL_IDS, AGENT_TOOLS, type AgentTool } from '@shared/ai'
import {
  AGENT_COLORS,
  type AgentInput,
  type Project,
  type Task,
  type TaskOutputEvent,
} from '@shared/types'
import { stripAnsi } from '../infra/ansi'
import { newId } from '../infra/ids'
import { loadLoginShellPath } from '../infra/loginShellPath'
import { commandShell, isOnPath } from '../infra/shell'
import type { ProjectRepository } from '../projects/ProjectRepository'
import { ProjectWorkspace } from '../projects/ProjectWorkspace'
import { buildAgentCommand } from './agents/agentCommand'
import type { AgentRun, AgentRunner } from './agents/AgentRunner'
import { buildTaskBrief, taskInstruction } from './agents/taskBrief'
import type { Plan, Planner } from './planning/Planner'
import { dependentsOf, goalStatus, isFinished, readyTasks } from './taskGraph'

export interface OrchestratorEvents {
  onTaskOutput(event: TaskOutputEvent): void
}

/** How much trailing output is kept as a task's result (shared with dependent tasks). */
const RESULT_TAIL_CHARS = 4000
const OUTPUT_BUFFER_CHARS = 20000

/**
 * Receives goals for a project, asks the planner to split them into tasks (adding the agents
 * the work needs), and dispatches those tasks to the project's agents as their dependencies
 * complete. Each agent runs one
 * task at a time; different agents run in parallel.
 */
export class Orchestrator {
  private readonly runs = new Map<string, AgentRun>()

  constructor(
    private readonly projects: ProjectRepository,
    private readonly runner: AgentRunner,
    private readonly createPlanner: () => Planner,
    private readonly events: OrchestratorEvents,
  ) {}

  /** Tasks marked running by a previous session can't be resumed: mark them as interrupted. */
  recoverInterruptedWork(): void {
    for (const project of this.projects.list()) {
      const stale = project.tasks.some((t) => t.status === 'running')
      const planning = project.goals.some((g) => g.status === 'planning')
      if (!stale && !planning) continue

      this.mutate(project.id, (draft) => {
        for (const task of draft.tasks.filter((t) => t.status === 'running')) {
          this.finishTask(draft, task, 'failed', 'Interrupted: Veltrix was closed while running.')
        }
        for (const goal of draft.goals.filter((g) => g.status === 'planning')) {
          goal.status = 'failed'
          goal.error = 'Interrupted: Veltrix was closed while planning.'
        }
      })
    }
  }

  async submit(projectId: string, prompt: string): Promise<void> {
    const project = this.projects.get(projectId)
    if (!prompt.trim()) throw new Error('Describe what the agents should do.')

    const goalId = newId()
    this.mutate(projectId, (draft) => {
      draft.goals.push({
        id: goalId,
        prompt: prompt.trim(),
        status: 'planning',
        createdAt: Date.now(),
      })
    })

    try {
      const context = await new ProjectWorkspace(project).plannerContext()
      await loadLoginShellPath()
      const tools = availableTools(project)
      const plan = await this.createPlanner().plan({
        project: this.projects.get(projectId),
        context,
        goal: prompt,
        tools,
      })

      const created = this.recruit(projectId, plan, tools)
      const agentIdOf = (key: string): string => created.get(key) ?? key
      const idByKey = new Map(plan.tasks.map((task) => [task.key, newId()]))
      this.mutate(projectId, (draft) => {
        const goal = draft.goals.find((g) => g.id === goalId)!
        goal.plan = plan.summary
        goal.status = plan.tasks.length ? 'running' : 'done'
        if (created.size) goal.createdAgentIds = [...created.values()]
        for (const planned of plan.tasks) {
          draft.tasks.push({
            id: idByKey.get(planned.key)!,
            projectId,
            goalId,
            title: planned.title,
            description: planned.description,
            agentId: agentIdOf(planned.agentId),
            dependsOn: planned.dependsOn.map((key) => idByKey.get(key)!),
            status: 'pending',
            createdAt: Date.now(),
          })
        }
      })
      this.dispatch(projectId)
    } catch (error) {
      this.mutate(projectId, (draft) => {
        const goal = draft.goals.find((g) => g.id === goalId)
        if (!goal) return
        goal.status = 'failed'
        goal.error = errorMessage(error)
      })
    }
  }

  /**
   * Adds the agents the plan asks for, with names that don't clash with existing ones and
   * a tool that is installed. Resolves with the new agent id of each plan key.
   */
  private recruit(projectId: string, plan: Plan, tools: AgentTool[]): Map<string, string> {
    if (plan.newAgents.length === 0) return new Map()
    const project = this.projects.get(projectId)
    const taken = new Set(project.agents.map((agent) => agent.name.trim().toLowerCase()))
    const inputs: AgentInput[] = plan.newAgents.map((planned, index) => {
      const name = uniqueName(planned.name.trim() || planned.key, taken)
      taken.add(name.toLowerCase())
      return {
        name,
        role: planned.role.trim(),
        provider: tools.includes(planned.tool) ? planned.tool : tools[0],
        color: AGENT_COLORS[(project.agents.length + index) % AGENT_COLORS.length],
      }
    })
    const added = this.projects.addAgents(projectId, inputs)
    return new Map(plan.newAgents.map((planned, index) => [planned.key, added[index].id]))
  }

  cancelTask(projectId: string, taskId: string): void {
    this.mutate(projectId, (draft) => {
      const task = draft.tasks.find((t) => t.id === taskId)
      if (!task || isFinished(task)) return
      this.finishTask(draft, task, 'cancelled', task.result)
    })
    this.runs.get(taskId)?.kill()
  }

  retryTask(projectId: string, taskId: string): void {
    this.mutate(projectId, (draft) => {
      const task = draft.tasks.find((t) => t.id === taskId)
      if (!task || !isFinished(task) || task.status === 'done') return
      for (const t of [task, ...dependentsOf(task.id, draft.tasks)]) {
        if (t !== task && t.status !== 'blocked') continue
        t.status = 'pending'
        t.result = undefined
        t.startedAt = undefined
        t.finishedAt = undefined
      }
    })
    this.dispatch(projectId)
  }

  /** Removes finished goals and their tasks from the board. */
  clearFinished(projectId: string): void {
    this.mutate(projectId, (draft) => {
      const finished = new Set(
        draft.goals.filter((g) => g.status === 'done' || g.status === 'failed').map((g) => g.id),
      )
      draft.goals = draft.goals.filter((g) => !finished.has(g.id))
      draft.tasks = draft.tasks.filter((t) => !finished.has(t.goalId))
    })
  }

  async taskLog(projectId: string, taskId: string): Promise<string> {
    return new ProjectWorkspace(this.projects.get(projectId)).readLog(taskId)
  }

  shutdown(): void {
    for (const run of this.runs.values()) run.kill()
    this.runs.clear()
  }

  private dispatch(projectId: string): void {
    const project = this.projects.get(projectId)
    for (const task of readyTasks(project.tasks)) {
      void this.runTask(projectId, task.id)
    }
  }

  private async runTask(projectId: string, taskId: string): Promise<void> {
    const project = this.mutate(projectId, (draft) => {
      const task = draft.tasks.find((t) => t.id === taskId)!
      task.status = 'running'
      task.startedAt = Date.now()
    })
    const task = project.tasks.find((t) => t.id === taskId)!
    const runStartedAt = task.startedAt!

    let output = ''
    let exitCode: number
    try {
      const workspace = new ProjectWorkspace(project)
      const command = await this.prepareCommand(project, task, workspace)
      const log = await workspace.openLog(taskId)
      await loadLoginShellPath()

      const run = this.runner.start({
        cwd: project.path,
        commandLine: command,
        onData: (data) => {
          log.write(data)
          output = (output + data).slice(-OUTPUT_BUFFER_CHARS)
          this.events.onTaskOutput({ projectId, taskId, runStartedAt, data })
        },
      })
      this.runs.set(taskId, run)
      exitCode = await run.exited
      log.end()
    } catch (error) {
      output = errorMessage(error)
      exitCode = -1
    } finally {
      this.runs.delete(taskId)
    }

    this.mutate(projectId, (draft) => {
      const current = draft.tasks.find((t) => t.id === taskId)
      // Cancelled (or cleared) while running: the cancel path already recorded the outcome.
      if (!current || current.status !== 'running') return
      const result = stripAnsi(output).trim().slice(-RESULT_TAIL_CHARS)
      this.finishTask(draft, current, exitCode === 0 ? 'done' : 'failed', result)
    })
    this.dispatch(projectId)
  }

  private async prepareCommand(
    project: Project,
    task: Task,
    workspace: ProjectWorkspace,
  ): Promise<string> {
    const agent = project.agents.find((a) => a.id === task.agentId)
    if (!agent) throw new Error('The agent assigned to this task was removed.')
    const goal = project.goals.find((g) => g.id === task.goalId)!
    const dependencies = project.tasks.filter((t) => task.dependsOn.includes(t.id))

    await workspace.readContext(agent.id) // Creates the file from its template if needed.
    await workspace.writeBrief(
      task.id,
      buildTaskBrief({
        agent,
        goal,
        task,
        dependencies,
        contextFile: workspace.contextFile(agent.id).path,
        sharedContext: project.context?.scope !== 'perAgent',
      }),
    )
    const instruction = taskInstruction(workspace.briefRelativePath(task.id))
    return buildAgentCommand(agent, instruction, commandShell())
  }

  /** Sets a terminal status; anything waiting on a task that didn't succeed becomes blocked. */
  private finishTask(draft: Project, task: Task, status: Task['status'], result?: string): void {
    task.status = status
    task.result = result
    task.finishedAt = Date.now()
    if (status === 'done') return
    for (const dependent of dependentsOf(task.id, draft.tasks)) {
      if (dependent.status === 'pending') dependent.status = 'blocked'
    }
  }

  /** Project mutation that keeps goal statuses in sync with their tasks. */
  private mutate(projectId: string, change: (draft: Project) => void): Project {
    return this.projects.update(projectId, (draft) => {
      change(draft)
      for (const goal of draft.goals) goal.status = goalStatus(goal, draft.tasks)
    })
  }
}

/**
 * Agent CLIs new agents may use: installed ones, those the project already uses first
 * (one toolchain across the team). Every known tool when none is found, so planning
 * still works and the missing CLI shows up as a task error the user can act on.
 */
function availableTools(project: Project): AgentTool[] {
  const used = project.agents.flatMap((agent) =>
    agent.provider === 'custom' ? [] : [agent.provider],
  )
  const ordered = [...new Set([...used, ...AGENT_TOOL_IDS])]
  const installed = ordered.filter((tool) => isOnPath(AGENT_TOOLS[tool].binary))
  return installed.length ? installed : ordered
}

/** `name`, or `name 2`, `name 3`… when it is taken (case-insensitive). */
function uniqueName(name: string, taken: Set<string>): string {
  if (!taken.has(name.toLowerCase())) return name
  let n = 2
  while (taken.has(`${name} ${n}`.toLowerCase())) n++
  return `${name} ${n}`
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
