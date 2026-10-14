import { z } from 'zod/v4'
import type { Project } from '@shared/types'

export const PlanSchema = z.object({
  summary: z.string().describe('One short paragraph explaining the approach.'),
  tasks: z
    .array(
      z.object({
        key: z.string().describe('Short unique identifier, e.g. "t1".'),
        title: z.string(),
        description: z
          .string()
          .describe('Self-contained instructions: what to do, where, and how to verify it.'),
        agentId: z.string().describe('Id of the agent that will execute the task.'),
        dependsOn: z.array(z.string()).describe('Keys of tasks that must finish first.'),
      }),
    )
    .min(1),
})

export type Plan = z.infer<typeof PlanSchema>

export interface PlanRequest {
  project: Project
  /** Contents of the project's shared CONTEXT.md. */
  context: string
  goal: string
}

/** Turns a high-level goal into tasks routed to the project's agents. */
export interface Planner {
  plan(request: PlanRequest): Promise<Plan>
}

/** Validates the plan against the project: known agents, known dependency keys, no cycles. */
export function validatePlan(plan: Plan, project: Project): Plan {
  const agentIds = new Set(project.agents.map((agent) => agent.id))
  const keys = new Set(plan.tasks.map((task) => task.key))

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
