import { LOCALE_NAMES, LOCALES, type Locale } from '@shared/i18n'
import { Field } from '../../components/ui/Field'
import { useT } from '../../i18n'
import { useSettings } from '../../stores/settings'
import { selectClass, SettingsCard, SettingsPage } from './parts'

export function GeneralSettings() {
  const { settings, update } = useSettings()
  const t = useT()
  if (!settings) return null

  return (
    <SettingsPage title={t.settings.sections.general} description={t.settings.generalDescription}>
      <SettingsCard>
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
      </SettingsCard>
    </SettingsPage>
  )
}
