import { useEffect, useState } from 'react'
import { AGENT_COLORS, type Agent, type AgentInput, type AgentProvider } from '@shared/types'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { Field, Input, Textarea } from '../../components/ui/Field'
import { api } from '../../lib/api'
import { cn } from '../../lib/cn'
import { colorAt, tagDot } from '../../lib/colors'
import { providers } from './providers'

interface AgentDialogProps {
  projectId: string
  open: boolean
  /** Agent being edited, or undefined to create one. */
  agent?: Agent
  /** Used to pick a default color for new agents. */
  agentCount: number
  onClose(): void
}

const emptyAgent = (index: number): AgentInput => ({
  name: '',
  role: '',
  provider: 'claude',
  commandTemplate: '',
  color: colorAt(index),
})

export function AgentDialog({ projectId, open, agent, agentCount, onClose }: AgentDialogProps) {
  const [draft, setDraft] = useState<AgentInput>(agent ?? emptyAgent(agentCount))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setDraft(agent ?? emptyAgent(agentCount))
    setError(null)
  }, [open, agent, agentCount])

  const patch = (changes: Partial<AgentInput>): void => setDraft((d) => ({ ...d, ...changes }))
  const isCustom = draft.provider === 'custom'
  const valid =
    draft.name.trim() !== '' && (!isCustom || draft.commandTemplate?.includes('{prompt}'))

  const save = async (): Promise<void> => {
    try {
      await api.projects.saveAgent(projectId, { ...draft, id: agent?.id })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <Dialog
      title={agent ? 'Editar agente' : 'Novo agente'}
      open={open}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" disabled={!valid} onClick={() => void save()}>
            Salvar
          </Button>
        </>
      }
    >
      <Field label="Nome">
        <Input
          autoFocus
          value={draft.name}
          placeholder="ex.: backend"
          onChange={(e) => patch({ name: e.target.value })}
        />
      </Field>

      <Field
        label="Papel"
        hint="O orquestrador usa isso para decidir quais tarefas vão para este agente."
      >
        <Textarea
          rows={2}
          value={draft.role}
          placeholder="ex.: API em Node.js, banco de dados e testes de integração"
          onChange={(e) => patch({ role: e.target.value })}
        />
      </Field>

      <Field label="Ferramenta" hint={providers[draft.provider].description}>
        <div className="grid grid-cols-2 gap-1.5">
          {(Object.keys(providers) as AgentProvider[]).map((provider) => (
            <button
              key={provider}
              type="button"
              onClick={() => patch({ provider })}
              className={cn(
                'h-9 rounded-md border text-left px-3 transition-colors',
                draft.provider === provider
                  ? 'border-line-strong bg-raised text-fg'
                  : 'border-line text-muted hover:border-line-strong hover:text-fg',
              )}
            >
              {providers[provider].label}
            </button>
          ))}
        </div>
      </Field>

      {isCustom && (
        <Field label="Comando" hint="Executado no diretório do projeto. {prompt} recebe a instrução.">
          <Input
            className="font-mono text-xs"
            value={draft.commandTemplate}
            placeholder="aider --yes --message {prompt}"
            onChange={(e) => patch({ commandTemplate: e.target.value })}
          />
        </Field>
      )}

      <Field label="Cor">
        <div className="flex gap-2">
          {AGENT_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={color}
              onClick={() => patch({ color })}
              className={cn(
                'size-6 rounded-full ring-offset-2 ring-offset-panel transition',
                tagDot[color],
                draft.color === color ? 'ring-2 ring-fg/70' : 'opacity-60 hover:opacity-100',
              )}
            />
          ))}
        </div>
      </Field>

      {error && <p className="text-xs text-danger">{error}</p>}
    </Dialog>
  )
}
