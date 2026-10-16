import { AGENT_TOOL_IDS, AGENT_TOOLS } from '@shared/ai'
import type { AgentProvider } from '@shared/types'
import type { Messages } from '../../i18n'

/** Order the tools are offered in. */
export const providerIds: AgentProvider[] = [...AGENT_TOOL_IDS, 'custom']

/** Product names stay the same in every language; only the custom option is translated. */
export function providerLabel(provider: AgentProvider, t: Messages): string {
  return provider === 'custom' ? t.providers.customLabel : AGENT_TOOLS[provider].name
}
