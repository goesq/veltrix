import type { AgentProvider } from '@shared/types'

export const providers: Record<AgentProvider, { label: string; description: string }> = {
  claude: { label: 'Claude Code', description: 'Executa `claude -p` no diretório do projeto.' },
  codex: { label: 'Codex CLI', description: 'Executa `codex exec` com sandbox de escrita no projeto.' },
  gemini: { label: 'Gemini CLI', description: 'Executa `gemini -p` aprovando apenas edições.' },
  custom: { label: 'Comando próprio', description: 'Qualquer CLI headless. Use {prompt} no comando.' },
}
