import { useEffect, useState } from 'react'
import { Check, CircleAlert, LoaderCircle, PlugZap } from 'lucide-react'
import { plannerSpec, type PlannerCheck, type PlannerEngine } from '@shared/ai'
import type { Settings } from '@shared/types'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'
import { useT } from '../../i18n'
import { api } from '../../lib/api'
import { cn } from '../../lib/cn'
import { useAiTools } from '../../stores/aiTools'
import { useSettings } from '../../stores/settings'
import { ApiKeyField } from './ApiKeyField'
import { ENGINE_GROUPS, engineName, enginesIn } from './engines'
import { Badge, SettingsCard, SettingsPage } from './parts'

export function OrchestratorSettings() {
  const { settings, update } = useSettings()
  const t = useT()
  if (!settings) return null

  return (
    <SettingsPage
      title={t.settings.sections.orchestrator}
      description={t.settings.orchestratorDescription}
    >
      {ENGINE_GROUPS.map((group) => (
        <section key={group} className="flex flex-col gap-3">
          <div>
            <h2 className="text-xs font-medium uppercase tracking-wider text-faint">
              {t.settings.engineGroups[group]}
            </h2>
            <p className="mt-1 text-xs text-faint">{t.settings.engineGroupHints[group]}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            {enginesIn(group).map((engine) => (
              <EngineCard
                key={engine}
                engine={engine}
                settings={settings}
                selected={settings.plannerEngine === engine}
                onSelect={() => void update({ plannerEngine: engine })}
              />
            ))}
          </div>
        </section>
      ))}

      <EngineSetup engine={settings.plannerEngine} settings={settings} />
    </SettingsPage>
  )
}

interface EngineCardProps {
  engine: PlannerEngine
  settings: Settings
  selected: boolean
  onSelect(): void
}

function EngineCard({ engine, settings, selected, onSelect }: EngineCardProps) {
  const t = useT()
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'flex min-h-16 flex-col justify-between gap-2 rounded-lg border p-3 text-left transition-colors',
        selected ? 'border-fg/60 bg-raised' : 'border-line bg-panel hover:border-line-strong',
      )}
    >
      <span className="flex items-center gap-2">
        <span className="truncate font-medium">{engineName(engine, t)}</span>
        {selected && (
          <Check size={14} className="ml-auto shrink-0 text-fg" aria-label={t.settings.inUse} />
        )}
      </span>
      <EngineStatus engine={engine} settings={settings} />
    </button>
  )
}

/** Whether an engine is ready to use: its CLI is installed, or its key is saved. */
function EngineStatus({ engine, settings }: { engine: PlannerEngine; settings: Settings }) {
  const installed = useAiTools((s) => s.installed)
  const t = useT()
  const spec = plannerSpec(engine)

  if (spec.kind === 'cli') {
    if (!installed) return <Badge>…</Badge>
    return installed[spec.binary] ? (
      <Badge tone="success">{t.settings.installed}</Badge>
    ) : (
      <Badge>{t.settings.notInstalled}</Badge>
    )
  }
  const saved = settings.apiKeys.includes(engine)
  if (spec.key === 'none' || (spec.key === 'optional' && !saved)) {
    return <span className="truncate text-[11px] text-faint">{baseUrlOf(engine, settings)}</span>
  }
  return saved ? (
    <Badge tone="success">{t.settings.keySaved}</Badge>
  ) : (
    <Badge>{t.settings.keyMissing}</Badge>
  )
}

/** Model, endpoint and key of the engine in use, and a way to test it. */
function EngineSetup({ engine, settings }: { engine: PlannerEngine; settings: Settings }) {
  const update = useSettings((s) => s.update)
  const installed = useAiTools((s) => s.installed)
  const t = useT()
  const spec = plannerSpec(engine)
  const missingCli = spec.kind === 'cli' && installed !== null && !installed[spec.binary]

  return (
    <SettingsCard title={t.settings.engineSetup(engineName(engine, t))}>
      {missingCli && (
        <p className="flex items-start gap-2 text-xs text-warning">
          <CircleAlert size={14} className="mt-px shrink-0" />
          {t.settings.installHint(spec.binary)}
        </p>
      )}

      <Field
        label={t.settings.model}
        hint={
          spec.kind === 'cli'
            ? t.settings.modelCliHint
            : spec.defaultModel && t.settings.modelDefault(spec.defaultModel)
        }
      >
        <Input
          className="font-mono text-xs"
          value={settings.plannerModels[engine] ?? ''}
          placeholder={spec.kind === 'cli' ? undefined : spec.defaultModel}
          onChange={(e) =>
            void update({ plannerModels: { ...settings.plannerModels, [engine]: e.target.value } })
          }
        />
      </Field>

      {spec.kind === 'local' && (
        <Field label={t.settings.baseUrl} hint={t.settings.baseUrlHint}>
          <Input
            className="font-mono text-xs"
            value={settings.plannerBaseUrls[engine] ?? ''}
            placeholder={spec.baseUrl}
            onChange={(e) =>
              void update({
                plannerBaseUrls: { ...settings.plannerBaseUrls, [engine]: e.target.value },
              })
            }
          />
        </Field>
      )}

      {spec.kind !== 'cli' && spec.key !== 'none' && <ApiKeyField engine={engine} />}

      <ConnectionTest engine={engine} />
    </SettingsCard>
  )
}

function ConnectionTest({ engine }: { engine: PlannerEngine }) {
  const [result, setResult] = useState<PlannerCheck | 'testing' | null>(null)
  const t = useT()

  // A result only describes the engine it was run for.
  useEffect(() => setResult(null), [engine])

  const test = async (): Promise<void> => {
    setResult('testing')
    setResult(await api.ai.checkPlanner(engine))
  }

  return (
    <div className="flex items-start gap-3 border-t border-line pt-4">
      <Button
        icon={
          result === 'testing' ? (
            <LoaderCircle size={14} className="animate-spin" />
          ) : (
            <PlugZap size={14} />
          )
        }
        disabled={result === 'testing'}
        onClick={() => void test()}
      >
        {result === 'testing' ? t.settings.testing : t.settings.test}
      </Button>
      {result && result !== 'testing' && (
        <p
          className={cn(
            'min-w-0 flex-1 self-center break-words text-xs',
            result.ok ? 'text-success' : 'text-danger',
          )}
        >
          {result.ok
            ? [t.settings.testOk, result.detail].filter(Boolean).join(' · ')
            : result.error}
        </p>
      )}
    </div>
  )
}

function baseUrlOf(engine: PlannerEngine, settings: Settings): string | undefined {
  const spec = plannerSpec(engine)
  if (spec.kind === 'cli') return undefined
  return settings.plannerBaseUrls[engine]?.trim() || spec.baseUrl
}
