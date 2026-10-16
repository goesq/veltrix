import { useState } from 'react'
import { plannerSpec, type PlannerEngine } from '@shared/ai'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'
import { useT } from '../../i18n'
import { useSettings } from '../../stores/settings'

/** Saves or removes one provider's key; the stored key is never shown back. */
export function ApiKeyField({ engine, label }: { engine: PlannerEngine; label?: string }) {
  const { settings, setApiKey } = useSettings()
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const t = useT()
  if (!settings) return null

  const spec = plannerSpec(engine)
  const saved = settings.apiKeys.includes(engine)
  const optional = spec.kind !== 'cli' && spec.key === 'optional'
  const keyUrl = spec.kind !== 'cli' ? spec.keyUrl : undefined
  const placeholder = spec.kind !== 'cli' ? spec.keyPlaceholder : undefined

  const save = async (value: string | null): Promise<void> => {
    try {
      await setApiKey(engine, value)
      setDraft('')
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const status = saved ? t.settings.apiKeySaved : t.settings.apiKeyMissing
  return (
    <Field
      label={label ?? (optional ? t.settings.apiKeyOptional : t.settings.apiKey)}
      hint={
        error ? (
          <span className="text-danger">{error}</span>
        ) : (
          [status, keyUrl && t.settings.getKeyAt(keyUrl)].filter(Boolean).join(' ')
        )
      }
    >
      <div className="flex gap-2">
        <Input
          type="password"
          autoComplete="off"
          value={draft}
          placeholder={saved ? '••••••••••••' : placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && draft.trim()) void save(draft)
          }}
        />
        <Button disabled={!draft.trim()} onClick={() => void save(draft)}>
          {t.common.save}
        </Button>
        {saved && (
          <Button variant="danger" onClick={() => void save(null)}>
            {t.common.remove}
          </Button>
        )}
      </div>
    </Field>
  )
}
