import { useState, type ReactNode } from 'react'
import type { PlannerEngine } from '@shared/types'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'
import { cn } from '../../lib/cn'
import { useSettings } from '../../stores/settings'
import { useShellProfiles } from '../../stores/shellProfiles'
import { ShortcutSettings } from './ShortcutSettings'

const engines: Record<PlannerEngine, { label: string; description: string }> = {
  'claude-cli': {
    label: 'Claude Code (CLI)',
    description: 'Usa o `claude` instalado e o seu login atual. Não precisa de chave de API.',
  },
  'anthropic-api': {
    label: 'API da Anthropic',
    description: 'Chama a API diretamente com a sua chave, guardada no cofre do sistema.',
  },
}

export function SettingsView() {
  const { settings, update, setApiKey } = useSettings()
  const [apiKey, setApiKeyDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const shells = useShellProfiles()

  if (!settings) return null

  const setDefaultShell = async (profileId: string): Promise<void> => {
    await update({ defaultShellProfileId: profileId })
    await shells.load()
  }

  const saveKey = async (value: string | null): Promise<void> => {
    try {
      await setApiKey(value)
      setApiKeyDraft('')
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-8">
        <h1 className="text-base font-semibold">Configurações</h1>

        <Section
          title="Orquestrador"
          description="Quem planeja: recebe o objetivo, divide em tarefas e escolhe o agente de cada uma."
        >
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(engines) as PlannerEngine[]).map((engine) => (
              <button
                key={engine}
                type="button"
                onClick={() => void update({ plannerEngine: engine })}
                className={cn(
                  'flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors',
                  settings.plannerEngine === engine
                    ? 'border-line-strong bg-raised'
                    : 'border-line hover:border-line-strong',
                )}
              >
                <span className="font-medium">{engines[engine].label}</span>
                <span className="text-xs text-muted">{engines[engine].description}</span>
              </button>
            ))}
          </div>

          {settings.plannerEngine === 'anthropic-api' && (
            <>
              <Field label="Modelo">
                <Input
                  className="font-mono text-xs"
                  value={settings.plannerModel}
                  onChange={(e) => void update({ plannerModel: e.target.value })}
                />
              </Field>
              <Field
                label="Chave de API"
                hint={settings.hasApiKey ? 'Uma chave está salva.' : 'Nenhuma chave salva.'}
              >
                <div className="flex gap-2">
                  <Input
                    type="password"
                    autoComplete="off"
                    value={apiKey}
                    placeholder={settings.hasApiKey ? '••••••••••••' : 'sk-ant-…'}
                    onChange={(e) => setApiKeyDraft(e.target.value)}
                  />
                  <Button disabled={!apiKey.trim()} onClick={() => void saveKey(apiKey)}>
                    Salvar
                  </Button>
                  {settings.hasApiKey && (
                    <Button variant="danger" onClick={() => void saveKey(null)}>
                      Remover
                    </Button>
                  )}
                </div>
              </Field>
              {error && <p className="text-xs text-danger">{error}</p>}
            </>
          )}
        </Section>

        <Section title="Terminal">
          <Field label="Shell padrão" hint="Usado pelo botão + e pelo atalho de novo terminal.">
            <select
              value={shells.defaultId ?? ''}
              onChange={(e) => void setDefaultShell(e.target.value)}
              className="h-9 rounded-md border border-line bg-surface px-2.5 text-[13px] text-fg hover:border-line-strong focus:border-line-strong focus:outline-none"
            >
              {shells.profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tamanho da fonte">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={10}
                max={20}
                value={settings.terminalFontSize}
                onChange={(e) => void update({ terminalFontSize: Number(e.target.value) })}
                className="flex-1 accent-neutral-300"
              />
              <span className="w-10 text-right font-mono text-xs text-muted">
                {settings.terminalFontSize}px
              </span>
            </div>
          </Field>
        </Section>

        <Section title="Atalhos">
          <ShortcutSettings />
        </Section>
      </div>
    </div>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-muted">{description}</p>}
      </div>
      {children}
    </section>
  )
}
