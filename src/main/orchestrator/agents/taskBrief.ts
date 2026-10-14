import type { Agent, Goal, Task } from '@shared/types'

interface BriefInput {
  agent: Agent
  goal: Goal
  task: Task
  /** Finished tasks this one depends on. */
  dependencies: Task[]
  contextFile: string
}

/** Markdown brief written to `.veltrix/tasks/<id>.md`; the agent is pointed at this file. */
export function buildTaskBrief({ agent, goal, task, dependencies, contextFile }: BriefInput): string {
  const dependencySection = dependencies.length
    ? dependencies
        .map((dep) => `### ${dep.title}\n\n${dep.result?.trim() || '(no output captured)'}`)
        .join('\n\n')
    : 'None. This task can start from the current state of the repository.'

  return `# Task: ${task.title}

You are **${agent.name}**${agent.role ? `, responsible for: ${agent.role}` : ''}.
You are one of several agents working in this repository at the same time, coordinated by an orchestrator.

## Overall goal

${goal.prompt.trim()}

## Shared context

Read \`${contextFile}\` before starting. It holds the project conventions shared by every agent.
If you learn something other agents must know (a decision, a convention, a gotcha),
append it to the "Notes from agents" section of that file. Keep it short.

## Results from tasks you depend on

${dependencySection}

## Your task

${task.description.trim()}

## Rules

- Stay within the scope of this task; other agents handle the rest of the goal.
- Do not commit, push or rewrite git history.
- When done, end with a short summary of what you changed and anything left open.
`
}

export function taskInstruction(briefPath: string): string {
  return `Read the task brief at ${briefPath} and carry it out. End with a short summary of what you did.`
}
