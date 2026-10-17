import { useEffect, useState } from 'react'
import { AGENT_COLORS, type Agent, type AgentInput } from '@shared/types'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { Field, Input, Textarea } from '../../components/ui/Field'
import { useT } from '../../i18n'
import { api } from '../../lib/api'
import { cn } from '../../lib/cn'
import { colorAt, tagDot } from '../../lib/colors'
import { AgentWorktree } from './AgentWorktree'
import { providerIds, providerLabel } from './providers'

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
  const t = useT()

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
      title={agent ? t.agents.editTitle : t.agents.newTitle}
      open={open}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button variant="primary" disabled={!valid} onClick={() => void save()}>
            {t.common.save}
          </Button>
        </>
      }
    >
      <Field label={t.agents.name}>
        <Input
          autoFocus
          value={draft.name}
          placeholder={t.agents.namePlaceholder}
          onChange={(e) => patch({ name: e.target.value })}
        />
      </Field>

      <Field label={t.agents.role} hint={t.agents.roleHint}>
        <Textarea
          rows={2}
          value={draft.role}
          placeholder={t.agents.rolePlaceholder}
          onChange={(e) => patch({ role: e.target.value })}
        />
      </Field>

      <Field label={t.agents.tool} hint={t.providers[draft.provider]}>
        <div className="grid grid-cols-2 gap-1.5">
          {providerIds.map((provider) => (
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
              {providerLabel(provider, t)}
            </button>
          ))}
        </div>
      </Field>

      {isCustom && (
        <Field label={t.agents.command} hint={t.agents.commandHint}>
          <Input
            className="font-mono text-xs"
            value={draft.commandTemplate}
            placeholder="aider --yes --message {prompt}"
            onChange={(e) => patch({ commandTemplate: e.target.value })}
          />
        </Field>
      )}

      <Field label={t.agents.color}>
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

      {agent && <AgentWorktree projectId={projectId} agent={agent} />}

      {error && <p className="text-xs text-danger">{error}</p>}
    </Dialog>
  )
}
