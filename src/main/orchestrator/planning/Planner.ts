import { z } from 'zod/v4'
import { AGENT_TOOL_IDS, type AgentTool } from '@shared/ai'
import type { Project } from '@shared/types'

export const PlanSchema = z.object({
  summary: z.string().describe('One short paragraph explaining the approach.'),
  newAgents: z
    .array(
      z.object({
        key: z.string().describe('Short unique identifier tasks use as agentId, e.g. "a1".'),
        name: z.string().describe('Short name, e.g. "frontend".'),
        role: z.string().describe('What the agent owns; used to route tasks to it.'),
        tool: z
          .enum(AGENT_TOOL_IDS as [AgentTool, ...AgentTool[]])
          .describe('Agent CLI that runs it, one of the available tools.'),
      }),
    )
    .describe('Agents to add to the project. Empty when the listed agents cover the goal.'),
  tasks: z.array(
    z.object({
      key: z.string().describe('Short unique identifier, e.g. "t1".'),
      title: z.string(),
      description: z
        .string()
        .describe('Self-contained instructions: what to do, where, and how to verify it.'),
      agentId: z
        .string()
        .describe('Id of a listed agent, or key of a new agent, that will execute the task.'),
      dependsOn: z.array(z.string()).describe('Keys of tasks that must finish first.'),
    }),
  ),
})

export type Plan = z.infer<typeof PlanSchema>

export interface PlanRequest {
  project: Project
  /** Contents of the project's shared CONTEXT.md. */
  context: string
  goal: string
  /** Agent CLIs new agents may use, the preferred one first. */
  tools: AgentTool[]
}

/** Turns a high-level goal into tasks routed to the project's agents, adding agents if needed. */
export interface Planner {
  plan(request: PlanRequest): Promise<Plan>
  /** Confirms the planner can be reached; resolves with a detail to show (a version). */
  check(): Promise<string | undefined>
}

/** Parses a plan out of a free-text reply that may still contain code fences or prose. */
export function parsePlanText(text: string, project: Project): Plan {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('The planner did not return JSON.')
  let json: unknown
  try {
    json = JSON.parse(text.slice(start, end + 1))
  } catch {
    throw new Error('The planner returned malformed JSON.')
  }
  const parsed = PlanSchema.safeParse(json)
  if (!parsed.success) throw new Error('The planner returned a plan in the wrong shape.')
  return validatePlan(parsed.data, project)
}

/**
 * Validates the plan against the project: tasks go to known or new agents, new agents have
 * unique keys, dependencies point at known tasks and there are no cycles.
 */
export function validatePlan(plan: Plan, project: Project): Plan {
  const newKeys = new Set(plan.newAgents.map((agent) => agent.key))
  const agentIds = new Set([...project.agents.map((agent) => agent.id), ...newKeys])
  const keys = new Set(plan.tasks.map((task) => task.key))

  if (plan.tasks.length === 0 && plan.newAgents.length === 0) {
    throw new Error('The planner returned no tasks and no agents.')
  }
  if (newKeys.size !== plan.newAgents.length)
    throw new Error('Planner returned duplicate agent keys.')
  if (keys.size !== plan.tasks.length) throw new Error('Planner returned duplicate task keys.')
  for (const task of plan.tasks) {
    if (!agentIds.has(task.agentId)) {
      throw new Error(`Planner assigned "${task.title}" to unknown agent "${task.agentId}".`)
    }
    const unknown = task.dependsOn.find((key) => !keys.has(key))
    if (unknown) throw new Error(`Task "${task.title}" depends on unknown task "${unknown}".`)
  }
  assertAcyclic(plan)
  return plan
}

function assertAcyclic(plan: Plan): void {
  const edges = new Map(plan.tasks.map((task) => [task.key, task.dependsOn]))
  const state = new Map<string, 'visiting' | 'done'>()
  const visit = (key: string): void => {
    if (state.get(key) === 'done') return
    if (state.get(key) === 'visiting') throw new Error('Planner returned circular dependencies.')
    state.set(key, 'visiting')
    edges.get(key)?.forEach(visit)
    state.set(key, 'done')
  }
  plan.tasks.forEach((task) => visit(task.key))
}
