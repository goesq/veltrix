import { useState, type ReactNode } from 'react'
import { LOCALE_NAMES, LOCALES, type Locale } from '@shared/i18n'
import type { PlannerEngine } from '@shared/types'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'
import { SwitchField } from '../../components/ui/Switch'
import { useT, type Messages } from '../../i18n'
import { api } from '../../lib/api'
import { cn } from '../../lib/cn'
import { useSettings } from '../../stores/settings'
import { useShellProfiles } from '../../stores/shellProfiles'
import { ShortcutSettings } from './ShortcutSettings'

const PLANNER_ENGINES: PlannerEngine[] = ['claude-cli', 'anthropic-api']

function engineText(engine: PlannerEngine, t: Messages): { label: string; description: string } {
  return engine === 'claude-cli'
    ? { label: 'Claude Code (CLI)', description: t.settings.claudeCli }
    : { label: t.settings.anthropicApi, description: t.settings.anthropicApiDescription }
}

const selectClass =
  'h-9 rounded-md border border-line bg-surface px-2.5 text-[13px] text-fg hover:border-line-strong focus:border-line-strong focus:outline-none'

export function SettingsView() {
  const { settings, update, setApiKey } = useSettings()
  const [apiKey, setApiKeyDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const shells = useShellProfiles()
  const t = useT()

  if (!settings) return null

  const setDefaultShell = async (profileId: string): Promise<void> => {
    await update({ defaultShellProfileId: profileId })
    await shells.load()
  }

  const pickDefaultCwd = async (): Promise<void> => {
    const folder = await api.dialog.pickDirectory()
    if (folder) await update({ defaultTerminalCwd: folder })
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
        <h1 className="text-base font-semibold">{t.settings.title}</h1>

        <Section title={t.settings.general}>
          <Field label={t.settings.language}>
            {/* Each language is listed in its own name, so it can be found from any language. */}
            <select
              value={settings.language ?? ''}
              onChange={(e) => void update({ language: (e.target.value || null) as Locale | null })}
              className={selectClass}
            >
              <option value="">{t.settings.languageAuto}</option>
              {LOCALES.map((locale) => (
                <option key={locale} value={locale}>
                  {LOCALE_NAMES[locale]}
                </option>
              ))}
            </select>
          </Field>
        </Section>

        <Section title={t.settings.orchestrator} description={t.settings.orchestratorDescription}>
          <div className="grid grid-cols-2 gap-2">
            {PLANNER_ENGINES.map((engine) => {
              const { label, description } = engineText(engine, t)
              return (
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
                  <span className="font-medium">{label}</span>
                  <span className="text-xs text-muted">{description}</span>
                </button>
              )
            })}
          </div>

          {settings.plannerEngine === 'anthropic-api' && (
            <>
              <Field label={t.settings.model}>
                <Input
                  className="font-mono text-xs"
                  value={settings.plannerModel}
                  onChange={(e) => void update({ plannerModel: e.target.value })}
                />
              </Field>
              <Field
                label={t.settings.apiKey}
                hint={settings.hasApiKey ? t.settings.apiKeySaved : t.settings.apiKeyMissing}
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
                    {t.common.save}
                  </Button>
                  {settings.hasApiKey && (
                    <Button variant="danger" onClick={() => void saveKey(null)}>
                      {t.common.remove}
                    </Button>
                  )}
                </div>
              </Field>
              {error && <p className="text-xs text-danger">{error}</p>}
            </>
          )}
        </Section>

        <Section title={t.settings.terminal}>
          <Field label={t.settings.defaultShell} hint={t.settings.defaultShellHint}>
            <select
              value={shells.defaultId ?? ''}
              onChange={(e) => void setDefaultShell(e.target.value)}
              className={selectClass}
            >
              {shells.profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t.settings.startFolder} hint={t.settings.startFolderHint}>
            <div className="flex gap-2">
              <Input
                readOnly
                value={settings.defaultTerminalCwd ?? ''}
                placeholder={t.settings.homeFolder}
                title={settings.defaultTerminalCwd ?? undefined}
                onClick={() => void pickDefaultCwd()}
                className="cursor-pointer truncate font-mono text-xs"
              />
              <Button onClick={() => void pickDefaultCwd()}>{t.common.choose}</Button>
              {settings.defaultTerminalCwd && (
                <Button variant="ghost" onClick={() => void update({ defaultTerminalCwd: null })}>
                  {t.common.clear}
                </Button>
              )}
            </div>
          </Field>
          <SwitchField
            label={t.settings.prompt}
            hint={t.settings.promptHint}
            checked={settings.terminalPrompt}
            onChange={(terminalPrompt) => void update({ terminalPrompt })}
          />
          <SwitchField
            label={t.settings.banner}
            hint={t.settings.bannerHint}
            checked={settings.terminalBanner}
            onChange={(terminalBanner) => void update({ terminalBanner })}
          />
          <p className="-mt-2 text-xs text-faint">{t.settings.terminalNote}</p>
          <Field label={t.settings.fontSize}>
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

        <Section title={t.settings.shortcuts}>
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
