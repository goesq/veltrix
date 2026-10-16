import { Fragment } from 'react'
import { RefreshCw } from 'lucide-react'
import { AGENT_TOOL_IDS, AGENT_TOOLS } from '@shared/ai'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { useT } from '../../i18n'
import { useAiTools } from '../../stores/aiTools'
import { SettingsCard, SettingsPage } from './parts'

/** The CLIs agents can run with, whether each one is installed, and the exact command used. */
export function AgentToolSettings() {
  const { installed, refresh } = useAiTools()
  const t = useT()

  return (
    <SettingsPage title={t.settings.sections.agents} description={t.settings.agentsDescription}>
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-faint">{t.settings.agentsHowTo}</p>
        <Button
          variant="ghost"
          icon={<RefreshCw size={13} />}
          onClick={() => void refresh()}
          className="shrink-0"
        >
          {t.settings.refresh}
        </Button>
      </div>

      <SettingsCard className="gap-0 p-0">
        {AGENT_TOOL_IDS.map((id, index) => {
          const tool = AGENT_TOOLS[id]
          return (
            <Fragment key={id}>
              {index > 0 && <hr className="border-line" />}
              <div className="flex flex-col gap-1.5 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{tool.name}</span>
                  {installed &&
                    (installed[tool.binary] ? (
                      <Badge tone="success">{t.settings.installed}</Badge>
                    ) : (
                      <Badge>{t.settings.notInstalled}</Badge>
                    ))}
                </div>
                <p className="text-xs text-muted">{t.providers[id]}</p>
                <code className="truncate font-mono text-[11px] text-faint" title={tool.command}>
                  {tool.command}
                </code>
              </div>
            </Fragment>
          )
        })}
      </SettingsCard>

      <p className="text-xs text-faint">{t.settings.customToolHint}</p>
    </SettingsPage>
  )
}
