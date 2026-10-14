import { useState } from 'react'
import { ChevronDown, Columns2, Plus, Square, SquareTerminal, X } from 'lucide-react'
import { MAX_TERMINALS } from '@shared/constants'
import { useShortcutLabel } from '../../keybindings/bindings'
import { cn } from '../../lib/cn'
import { tagDot } from '../../lib/colors'
import { useShellProfiles } from '../../stores/shellProfiles'
import { useTerminals, workspaceTabs, type TerminalTab } from '../../stores/terminals'
import { useUi } from '../../stores/ui'
import { IconButton } from '../ui/Button'
import { Menu } from '../ui/Menu'
import { StatusDot } from '../ui/StatusDot'
import { NavItem } from './NavItem'

/** "Terminais" section: the open terminals, a new-terminal button and the layout toggle. */
export function SidebarTerminals({ collapsed }: { collapsed: boolean }) {
  const { tabs, activeId, layout, focus, open, setLayout } = useTerminals()
  const { view, navigate, terminalListExpanded, toggleTerminalList } = useUi()
  const visible = workspaceTabs(tabs)
  const full = tabs.length >= MAX_TERMINALS

  const show = (id: string): void => {
    focus(id)
    navigate('terminals')
  }
  const openNew = (profileId?: string): void => {
    navigate('terminals')
    void open({ profileId })
  }

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1">
        <NavItem
          collapsed
          icon={<SquareTerminal size={16} />}
          label="Terminais"
          badge={`${tabs.length}/${MAX_TERMINALS}`}
          active={view === 'terminals'}
          onSelect={() => navigate('terminals')}
        />
        {visible.map((tab) => (
          <button
            key={tab.id}
            type="button"
            title={tab.title}
            aria-label={tab.title}
            onClick={() => show(tab.id)}
            className={cn(
              'flex size-7 items-center justify-center rounded-md transition-colors hover:bg-raised/60',
              view === 'terminals' && tab.id === activeId && 'bg-raised',
            )}
          >
            <StatusDot className={tab.exitCode === undefined ? tagDot[tab.color] : 'bg-faint'} />
          </button>
        ))}
        <IconButton label="Novo terminal" disabled={full} onClick={() => openNew()}>
          <Plus size={14} />
        </IconButton>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      <NavItem
        collapsed={false}
        icon={<SquareTerminal size={16} />}
        label="Terminais"
        badge={tabs.length > 0 ? `${tabs.length}/${MAX_TERMINALS}` : undefined}
        active={view === 'terminals'}
        expanded={visible.length > 0 ? terminalListExpanded : undefined}
        onToggle={toggleTerminalList}
        onSelect={() => navigate('terminals')}
      />

      {terminalListExpanded &&
        visible.map((tab) => (
          <TerminalItem
            key={tab.id}
            tab={tab}
            selected={view === 'terminals' && tab.id === activeId}
            onSelect={() => show(tab.id)}
          />
        ))}

      <div className="flex h-7 items-center pl-7 pr-1">
        <NewTerminalButton disabled={full} onOpen={openNew} />
        {visible.length > 1 && (
          <IconButton
            label={layout === 'grid' ? 'Mostrar um terminal' : 'Mostrar todos em grade'}
            className="ml-auto size-6"
            onClick={() => {
              setLayout(layout === 'grid' ? 'single' : 'grid')
              navigate('terminals')
            }}
          >
            {layout === 'grid' ? <Square size={13} /> : <Columns2 size={13} />}
          </IconButton>
        )}
      </div>
    </div>
  )
}

/** A terminal in the list: click to show, double-click to rename, ✕ on hover to close. */
function TerminalItem({
  tab,
  selected,
  onSelect,
}: {
  tab: TerminalTab
  selected: boolean
  onSelect(): void
}) {
  const { rename, close } = useTerminals()
  const [editing, setEditing] = useState(false)

  return (
    <div
      className={cn(
        'group relative flex h-7 items-center gap-2.5 rounded-md pl-9 pr-8 text-[12.5px] transition-colors',
        selected ? 'text-fg' : 'text-muted hover:bg-raised/60 hover:text-fg',
      )}
    >
      <StatusDot className={tab.exitCode === undefined ? tagDot[tab.color] : 'bg-faint'} />
      {editing ? (
        <input
          autoFocus
          defaultValue={tab.title}
          onBlur={(event) => {
            rename(tab.id, event.target.value)
            setEditing(false)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
            if (event.key === 'Escape') setEditing(false)
          }}
          className="min-w-0 flex-1 bg-transparent outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={onSelect}
          onDoubleClick={() => setEditing(true)}
          title={`${tab.cwd}\nClique duas vezes para renomear`}
          className="min-w-0 flex-1 truncate text-left after:absolute after:inset-0"
        >
          {tab.title}
        </button>
      )}
      <IconButton
        label="Fechar terminal"
        onClick={() => void close(tab.id)}
        className="absolute right-1 top-0.5 z-10 size-6 opacity-0 group-hover:opacity-100"
      >
        <X size={12} />
      </IconButton>
    </div>
  )
}

/** "+ Novo terminal" opens the default shell; the chevron lists every installed shell. */
function NewTerminalButton({
  disabled,
  onOpen,
}: {
  disabled: boolean
  onOpen(profileId?: string): void
}) {
  const { profiles, defaultId } = useShellProfiles()
  const shortcut = useShortcutLabel('terminal.new')
  const limitLabel = `Limite de ${MAX_TERMINALS} terminais`

  return (
    <div className="flex items-center text-faint">
      <button
        type="button"
        disabled={disabled}
        title={disabled ? limitLabel : shortcut}
        onClick={() => onOpen()}
        className="flex h-6 items-center gap-2 rounded-md px-2 text-[12.5px] transition-colors hover:bg-raised/60 hover:text-fg disabled:opacity-40"
      >
        <Plus size={13} />
        Novo terminal
      </button>
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
            className="size-6"
            onClick={toggle}
          >
            <ChevronDown size={12} />
          </IconButton>
        )}
      />
    </div>
  )
}
