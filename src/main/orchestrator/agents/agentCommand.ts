import { AGENT_TOOLS, PROMPT_PLACEHOLDER } from '@shared/ai'
import type { Agent } from '@shared/types'
import type { CommandShell } from '../../infra/shell'

export function buildAgentCommand(agent: Agent, instruction: string, shell: CommandShell): string {
  const template =
    agent.provider === 'custom'
      ? agent.commandTemplate?.trim()
      : AGENT_TOOLS[agent.provider]?.command
  if (!template) throw new Error(`Agent "${agent.name}" has no command configured.`)
  if (!template.includes(PROMPT_PLACEHOLDER)) {
    throw new Error(`The command of "${agent.name}" must contain ${PROMPT_PLACEHOLDER}.`)
  }
  return template.replaceAll(PROMPT_PLACEHOLDER, shell.quote(instruction))
}
