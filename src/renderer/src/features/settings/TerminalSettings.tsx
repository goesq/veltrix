import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'
import { SwitchField } from '../../components/ui/Switch'
import { useT } from '../../i18n'
import { api } from '../../lib/api'
import { useSettings } from '../../stores/settings'
import { useShellProfiles } from '../../stores/shellProfiles'
import { selectClass, SettingsCard, SettingsPage } from './parts'

export function TerminalSettings() {
  const { settings, update } = useSettings()
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

  return (
    <SettingsPage title={t.settings.sections.terminal} description={t.settings.terminalDescription}>
      <SettingsCard>
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
      </SettingsCard>

      <SettingsCard>
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
        <p className="border-t border-line pt-3 text-xs text-faint">{t.settings.terminalNote}</p>
      </SettingsCard>

      <SettingsCard>
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
      </SettingsCard>
    </SettingsPage>
  )
}
