import type { Agent } from '@shared/types'

export const SEND_COMMAND = 'veltrix-send'

/** A canvas note as an agent sees it. */
export interface NoteRef {
  title: string
  /** Relative to the project folder. */
  path: string
  locked?: boolean
}

interface LiveBriefInput {
  agent: Agent
  projectName: string
  /** Context file this agent reads (relative to the project, or absolute). */
  contextFile: string
  /** Notes linked to the agent when the session starts. */
  notes: NoteRef[]
  /** Name of the manager that recruited this agent, if any. */
  managerName?: string
}

/**
 * Markdown written to `.veltrix/live/<agent id>.md` when a live session starts. The agent
 * is told to read it first; it explains who the agent is and how to reach the others.
 * Who it may message changes as lines are drawn, so it asks Veltrix instead of a list here.
 */
export function buildLiveBrief({
  agent,
  projectName,
  contextFile,
  notes,
  managerName,
}: LiveBriefInput): string {
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

## Notes

The user can also link you to notes on the canvas: markdown files in the project that you
read and edit directly, shared with the user and with other agents. \`${SEND_COMMAND} --peers\`
lists the ones you can reach.

- Treat a note as shared memory: keep it tidy and edit only what concerns you.
- Checklists (\`- [ ] item\`) are work to do. When you finish an item, change it to
  \`- [x] item\` in the file right away, so the user sees progress as it happens.
- Notes marked read-only are specs: follow them, never edit them.

${notes.length ? `Notes linked to you now:\n\n${describeNotes(notes)}` : 'No notes are linked to you yet.'}
${PORTAL_SECTION}${agent.manager ? MANAGER_SECTION : ''}${managerName ? recruitSection(managerName) : ''}
Wait for the user's instructions or for a message before doing anything else.
`
}

const PORTAL_SECTION = `
## Browser portals

The user can link you to browser portals on the canvas: web pages you can drive.

    ${SEND_COMMAND} --browser open <url>
    ${SEND_COMMAND} --browser read                  (text, plus numbered links, buttons, fields)
    ${SEND_COMMAND} --browser click <number|text>
    ${SEND_COMMAND} --browser type <number|field> "text"   (end the text with \\n to press Enter)
    ${SEND_COMMAND} --browser screenshot            (saves a PNG you can open)
    ${SEND_COMMAND} --browser back

Add \`--portal <name>\` when you are linked to more than one. Read the page again after
anything that changes it. Never enter passwords or payment details; ask the user instead.
`

const MANAGER_SECTION = `
## Your team

You are a manager: you can assemble a team of agents on the canvas.

    ${SEND_COMMAND} --recruit <name> "<role>" [--tool claude|codex|gemini|...]
    ${SEND_COMMAND} --dismiss <name>

- A recruit appears below you, linked to you both ways, and starts at once with your own
  agent CLI unless you pick another with \`--tool\`. Give it about 15 seconds to start, then
  send it a self-contained task with \`${SEND_COMMAND} <name> "..."\`.
- Recruit only for work that benefits from a separate agent (a distinct area, or parallel
  work), keep the team small, and give each recruit a clear role.
- Share your linked notes by naming their files in the task; tell recruits to tick checklist
  items as they finish.
- Dismiss recruits whose work is done.
`

function recruitSection(managerName: string): string {
  return `
## Your manager

You were recruited by ${managerName}. Its messages are your tasks. When you finish one, report
back with what you changed: \`${SEND_COMMAND} ${/\s/.test(managerName) ? `"${managerName}"` : managerName} "..."\`.
`
}

/** One line per note: its name, file and whether it is read-only. */
export function describeNotes(notes: NoteRef[]): string {
  return notes
    .map(
      (note) => `- "${note.title || 'Untitled'}": ${note.path}${note.locked ? ' (read-only)' : ''}`,
    )
    .join('\n')
}

/** Told to a running agent when the user links it to notes. */
export function formatNoteLink(notes: NoteRef[]): string {
  const one = notes.length === 1
  return `[Veltrix] You are now linked to ${one ? 'a note' : 'these notes'}:\n${describeNotes(notes)}\nRead ${one ? 'it' : 'them'} now. Tick checklist items (- [x]) in the file as you finish them.`
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
