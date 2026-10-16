import { useEffect, type ReactNode } from 'react'
import { Bot, KeyRound, Keyboard, SlidersHorizontal, SquareTerminal, Workflow } from 'lucide-react'
import { useT, type Messages } from '../../i18n'
import { cn } from '../../lib/cn'
import { useAiTools } from '../../stores/aiTools'
import { useUi, type SettingsSection } from '../../stores/ui'
import { AgentToolSettings } from './AgentToolSettings'
import { ApiKeySettings } from './ApiKeySettings'
import { GeneralSettings } from './GeneralSettings'
import { OrchestratorSettings } from './OrchestratorSettings'
import { SettingsPage } from './parts'
import { ShortcutSettings } from './ShortcutSettings'
import { TerminalSettings } from './TerminalSettings'

type NavGroup = keyof Messages['settings']['groups']

const NAV: { group: NavGroup; sections: { id: SettingsSection; icon: ReactNode }[] }[] = [
  {
    group: 'app',
    sections: [{ id: 'general', icon: <SlidersHorizontal size={15} /> }],
  },
  {
    group: 'ai',
    sections: [
      { id: 'orchestrator', icon: <Workflow size={15} /> },
      { id: 'apiKeys', icon: <KeyRound size={15} /> },
      { id: 'agents', icon: <Bot size={15} /> },
    ],
  },
  {
    group: 'workspace',
    sections: [
      { id: 'terminal', icon: <SquareTerminal size={15} /> },
      { id: 'shortcuts', icon: <Keyboard size={15} /> },
    ],
  },
]

/** Settings split by subject: a section list on the left, the chosen section on the right. */
export function SettingsView() {
  const settingsSection = useUi((s) => s.settingsSection)
  const openSettings = useUi((s) => s.openSettings)
  const refreshTools = useAiTools((s) => s.refresh)
  const t = useT()

  // Installed CLIs can change while the app is open, so check each time settings open.
  useEffect(() => void refreshTools(), [refreshTools])

  return (
    <div className="flex h-full">
      <nav
        aria-label={t.settings.title}
        className="flex w-52 shrink-0 flex-col gap-5 overflow-y-auto border-r border-line px-3 py-6"
      >
        <h1 className="px-2 text-base font-semibold">{t.settings.title}</h1>
        {NAV.map(({ group, sections }) => (
          <div key={group} className="flex flex-col gap-0.5">
            <span className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-faint">
              {t.settings.groups[group]}
            </span>
            {sections.map(({ id, icon }) => (
              <button
                key={id}
                type="button"
                aria-current={settingsSection === id ? 'page' : undefined}
                onClick={() => openSettings(id)}
                className={cn(
                  'flex h-8 items-center gap-2.5 rounded-md px-2 text-left text-[13px] transition-colors',
                  settingsSection === id
                    ? 'bg-raised text-fg'
                    : 'text-muted hover:bg-raised/60 hover:text-fg',
                )}
              >
                {icon}
                {t.settings.sections[id]}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-8 py-8">
          <Section id={settingsSection} />
        </div>
      </div>
    </div>
  )
}

function Section({ id }: { id: SettingsSection }) {
  const t = useT()
  switch (id) {
    case 'general':
      return <GeneralSettings />
    case 'orchestrator':
      return <OrchestratorSettings />
    case 'apiKeys':
      return <ApiKeySettings />
    case 'agents':
      return <AgentToolSettings />
    case 'terminal':
      return <TerminalSettings />
    case 'shortcuts':
      return (
        <SettingsPage
          title={t.settings.sections.shortcuts}
          description={t.settings.shortcutsDescription}
        >
          <ShortcutSettings />
        </SettingsPage>
      )
  }
}
