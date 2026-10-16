import { Fragment } from 'react'
import { acceptsApiKey, PLANNER_ENGINE_IDS } from '@shared/ai'
import { useT } from '../../i18n'
import { useSettings } from '../../stores/settings'
import { ApiKeyField } from './ApiKeyField'
import { engineName } from './engines'
import { Badge, SettingsCard, SettingsPage } from './parts'

const KEY_ENGINES = PLANNER_ENGINE_IDS.filter(acceptsApiKey)

/** Every provider's key in one place, whichever one the orchestrator is using. */
export function ApiKeySettings() {
  const settings = useSettings((s) => s.settings)
  const t = useT()
  if (!settings) return null

  return (
    <SettingsPage title={t.settings.sections.apiKeys} description={t.settings.apiKeysDescription}>
      <SettingsCard className="gap-0 p-0">
        {KEY_ENGINES.map((engine, index) => (
          <Fragment key={engine}>
            {index > 0 && <hr className="border-line" />}
            <div className="flex flex-col gap-3 p-4">
              <div className="flex items-center gap-2">
                <span className="font-medium">{engineName(engine, t)}</span>
                {settings.plannerEngine === engine && <Badge>{t.settings.inUse}</Badge>}
                {settings.apiKeys.includes(engine) && (
                  <Badge tone="success">{t.settings.keySaved}</Badge>
                )}
              </div>
              <ApiKeyField engine={engine} />
            </div>
          </Fragment>
        ))}
      </SettingsCard>
    </SettingsPage>
  )
}
