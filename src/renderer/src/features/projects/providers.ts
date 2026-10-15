import type { AgentProvider } from '@shared/types'
import type { Messages } from '../../i18n'

/** Order the tools are offered in. */
export const providerIds: AgentProvider[] = ['claude', 'codex', 'gemini', 'custom']

/** Product names stay the same in every language; only the custom option is translated. */
const productNames: Record<Exclude<AgentProvider, 'custom'>, string> = {
  claude: 'Claude Code',
  codex: 'Codex CLI',
  gemini: 'Gemini CLI',
}

export function providerLabel(provider: AgentProvider, t: Messages): string {
  return provider === 'custom' ? t.providers.customLabel : productNames[provider]
}
