import { z } from 'zod/v4'
import { PlanSchema, type PlanRequest } from './Planner'

export const PLANNER_SYSTEM_PROMPT = `You are the orchestrator of a team of autonomous coding agents working in one repository.
Break the user's goal into the smallest set of concrete tasks that fully achieves it, and assign each task to the agent whose role fits best.

Guidelines:
- Each task description must be self-contained: the agent only sees the shared project context, the results of the tasks it depends on, and its own description.
- Prefer parallel work: only add a dependency when a task truly needs another task's output.
- Agents work in the same directory at the same time, so avoid giving parallel tasks overlapping files.
- Use only the agent ids listed. Do not invent agents.
- Do not add tasks for work the goal does not ask for.`

export function buildPlannerPrompt({ project, context, goal }: PlanRequest): string {
  const agents = project.agents
    .map((agent) => `- id: ${agent.id}\n  name: ${agent.name}\n  role: ${agent.role || 'generalist'}`)
    .join('\n')

  return `Project: ${project.name}

<shared_context>
${context.trim()}
</shared_context>

<agents>
${agents}
</agents>

<goal>
${goal.trim()}
</goal>`
}

/**
 * Single prompt for planners without schema-constrained output (CLIs, OpenAI-compatible
 * APIs): the instructions, the request and the JSON Schema the reply must follow.
 */
export function buildJsonPlannerPrompt(request: PlanRequest): string {
  return `${buildPlannerPrompt(request)}

Respond with only a JSON object matching this JSON Schema, with no prose and no code fences:
${JSON.stringify(z.toJSONSchema(PlanSchema))}`
}
