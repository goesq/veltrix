import type { Agent } from '@shared/types'

export const SEND_COMMAND = 'veltrix-send'

interface LiveBriefInput {
  agent: Agent
  projectName: string
  /** Context file this agent reads (relative to the project, or absolute). */
  contextFile: string
}

/**
 * Markdown written to `.veltrix/live/<agent id>.md` when a live session starts. The agent
 * is told to read it first; it explains who the agent is and how to reach the others.
 * Who it may message changes as lines are drawn, so it asks Veltrix instead of a list here.
 */
export function buildLiveBrief({ agent, projectName, contextFile }: LiveBriefInput): string {
  return `# You are ${agent.name}

You are a live agent in Veltrix, working on the project "${projectName}" next to other agents.
${agent.role ? `\nYour role: ${agent.role}\n` : ''}
Read \`${contextFile}\` for the project's conventions before you start working.

## Talking to other agents

The user connects agents on a canvas. When you are connected to another agent, you can send it
a message from your shell:

    ${SEND_COMMAND} <agent name> "your message"

- \`${SEND_COMMAND} --peers\` lists who you can message right now and who can message you.
- Messages from other agents arrive in this session starting with \`[Veltrix] Message from\`.
  Treat them like a request from a teammate: do the work, then reply with ${SEND_COMMAND}
  when they asked for something back.
- Keep messages short and self-contained; the other agent does not see your screen.
- Do not send a message just to acknowledge one, and stop when the conversation is done.

Wait for the user's instructions or for a message before doing anything else.
`
}

/** The short first instruction that points the agent at its brief. */
export function liveOpening(agent: Agent, briefPath: string): string {
  return `You are the agent "${agent.name}" in Veltrix. Read ${briefPath} now: it has your role and how to talk to the other agents. Then wait.`
}

/** How a message is shown in the receiving agent's session. */
export function formatIncoming(fromName: string, text: string): string {
  return `[Veltrix] Message from "${fromName}": ${text.trim()}\n(To reply: ${SEND_COMMAND} ${quoteName(fromName)} "your reply")`
}

function quoteName(name: string): string {
  return /\s/.test(name) ? `"${name}"` : name
}
