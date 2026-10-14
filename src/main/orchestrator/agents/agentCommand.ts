import type { Agent, AgentProvider } from '@shared/types'
import type { CommandShell } from '../../infra/shell'

const PROMPT_PLACEHOLDER = '{prompt}'

/**
 * Headless command line per CLI agent. `{prompt}` is replaced with the shell-quoted instruction.
 * Defaults are conservative: agents may edit files in the project, but nothing more.
 */
export const PROVIDER_COMMANDS: Record<Exclude<AgentProvider, 'custom'>, string> = {
  claude: `claude -p ${PROMPT_PLACEHOLDER} --permission-mode acceptEdits`,
  codex: `codex exec --sandbox workspace-write ${PROMPT_PLACEHOLDER}`,
  gemini: `gemini --approval-mode auto_edit -p ${PROMPT_PLACEHOLDER}`,
}

export function buildAgentCommand(agent: Agent, instruction: string, shell: CommandShell): string {
  const template =
    agent.provider === 'custom' ? agent.commandTemplate?.trim() : PROVIDER_COMMANDS[agent.provider]
  if (!template) throw new Error(`Agent "${agent.name}" has no command configured.`)
  if (!template.includes(PROMPT_PLACEHOLDER)) {
    throw new Error(`The command of "${agent.name}" must contain ${PROMPT_PLACEHOLDER}.`)
  }
  return template.replaceAll(PROMPT_PLACEHOLDER, shell.quote(instruction))
}
