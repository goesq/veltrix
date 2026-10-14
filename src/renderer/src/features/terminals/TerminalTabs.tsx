import { useState } from 'react'
import { ChevronDown, Columns2, Plus, Square, X } from 'lucide-react'
import { MAX_TERMINALS } from '@shared/constants'
import { IconButton } from '../../components/ui/Button'
import { Menu } from '../../components/ui/Menu'
import { StatusDot } from '../../components/ui/StatusDot'
import { cn } from '../../lib/cn'
import { tagDot } from '../../lib/colors'
import { useShortcutLabel } from '../../keybindings/bindings'
import { useShellProfiles } from '../../stores/shellProfiles'
import { useTerminals, type TerminalTab } from '../../stores/terminals'

export function TerminalTabs() {
  const { tabs, activeId, layout, focus, close, open, setLayout } = useTerminals()
  const full = tabs.length >= MAX_TERMINALS

  return (
    <div className="flex h-11 shrink-0 items-center gap-2 px-3">
      <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            tab={tab}
            active={tab.id === activeId}
            onSelect={() => focus(tab.id)}
            onClose={() => void close(tab.id)}
          />
        ))}
      </div>
      <NewTerminalButton disabled={full} onOpen={(profileId) => void open({ profileId })} />
      <div className="flex-1" />

      <div className="flex shrink-0 items-center gap-0.5 rounded-md border border-line p-0.5">
        <IconButton
          label="Um terminal"
          active={layout === 'single'}
          onClick={() => setLayout('single')}
        >
          <Square size={14} />
        </IconButton>
        <IconButton
          label="Grade com todos"
          active={layout === 'grid'}
          onClick={() => setLayout('grid')}
        >
          <Columns2 size={14} />
        </IconButton>
      </div>
    </div>
  )
}

/** "+" opens the default shell; the chevron lists every installed shell. */
function NewTerminalButton({
  disabled,
  onOpen,
}: {
  disabled: boolean
  onOpen(profileId?: string): void
}) {
  const { profiles, defaultId } = useShellProfiles()
  const limitLabel = `Limite de ${MAX_TERMINALS} terminais`
  const shortcut = useShortcutLabel('terminal.new')

  return (
    <div className="flex shrink-0 items-center">
      <IconButton
        label={disabled ? limitLabel : `Novo terminal${shortcut ? ` (${shortcut})` : ''}`}
        disabled={disabled}
        onClick={() => onOpen()}
      >
        <Plus size={15} />
      </IconButton>
      <Menu
        items={profiles.map((profile) => ({
          id: profile.id,
          label: profile.name,
          hint: profile.id === defaultId ? 'padrão' : undefined,
          onSelect: () => onOpen(profile.id),
        }))}
        trigger={({ open, toggle }) => (
          <IconButton
            label={disabled ? limitLabel : 'Escolher shell'}
            disabled={disabled || profiles.length === 0}
            active={open}
            className="w-5"
            onClick={toggle}
          >
            <ChevronDown size={13} />
          </IconButton>
        )}
      />
    </div>
  )
}

interface TabProps {
  tab: TerminalTab
  active: boolean
  onSelect(): void
  onClose(): void
}

function Tab({ tab, active, onSelect, onClose }: TabProps) {
  const rename = useTerminals((s) => s.rename)
  const [editing, setEditing] = useState(false)

  return (
    <div
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      onDoubleClick={() => setEditing(true)}
      onAuxClick={(event) => event.button === 1 && onClose()}
      className={cn(
        'group flex h-8 min-w-32 max-w-56 shrink-0 cursor-default items-center gap-2 rounded-md border pl-2.5 pr-1 transition-colors',
        active
          ? 'border-line-strong bg-panel text-fg'
          : 'border-transparent text-muted hover:bg-panel/60 hover:text-fg',
      )}
    >
      <StatusDot className={tab.exitCode === undefined ? tagDot[tab.color] : 'bg-faint'} />
      {editing ? (
        <input
          autoFocus
          defaultValue={tab.title}
          onClick={(event) => event.stopPropagation()}
          onBlur={(event) => {
            rename(tab.id, event.target.value)
            setEditing(false)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
            if (event.key === 'Escape') setEditing(false)
          }}
          className="w-full min-w-0 bg-transparent outline-none"
        />
      ) : (
        <span className="flex-1 truncate" title="Clique duas vezes para renomear">
          {tab.title}
        </span>
      )}
      <IconButton
        label="Fechar"
        className="size-6 opacity-0 group-hover:opacity-100 group-aria-selected:opacity-100"
        onClick={(event) => {
          event.stopPropagation()
          onClose()
        }}
      >
        <X size={13} />
      </IconButton>
    </div>
  )
}
