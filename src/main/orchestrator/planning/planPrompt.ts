import { z } from 'zod/v4'
import { AGENT_TOOLS } from '@shared/ai'
import { PlanSchema, type PlanRequest } from './Planner'

export const PLANNER_SYSTEM_PROMPT = `You are the orchestrator of a team of autonomous coding agents working in one repository.
Break the user's goal into the smallest set of concrete tasks that fully achieves it, and assign each task to the agent whose role fits best.

Building the team:
- Reuse the listed agents whenever their roles fit the work.
- Add agents in "newAgents" when the project has none, when no listed agent fits a task, when independent work could run in parallel on another agent, or when the user asks for specific agents. Give each a short name, a clear role and one of the available tools (the first one unless the user asks for another).
- Keep the team small: one agent per distinct area of work. Each agent runs one task at a time.
- Assign a task to a listed agent by its id, or to a new agent by its key.
- If the goal only asks to set up agents, return those agents and no tasks.

Tasks:
- Each task description must be self-contained: the agent only sees its project context, the results of the tasks it depends on, and its own description.
- Prefer parallel work: only add a dependency when a task truly needs another task's output.
- Agents work in the same directory at the same time, so avoid giving parallel tasks overlapping files.
- Do not add tasks for work the goal does not ask for.
- Write titles, descriptions, agent names and roles in the language of the goal.`

export function buildPlannerPrompt({ project, context, goal, tools }: PlanRequest): string {
  const agents = project.agents.length
    ? project.agents
        .map(
          (agent) =>
            `- id: ${agent.id}\n  name: ${agent.name}\n  role: ${agent.role || 'generalist'}`,
        )
        .join('\n')
    : '(none yet)'

  return `Project: ${project.name}

<project_context>
${context.trim()}
</project_context>

<agents>
${agents}
</agents>

<available_tools>
${tools.map((tool) => `- ${tool}: ${AGENT_TOOLS[tool].name}`).join('\n')}
</available_tools>

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
