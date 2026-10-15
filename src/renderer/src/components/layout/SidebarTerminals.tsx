import { useRef, useState } from 'react'
import { ChevronDown, Columns2, MoreHorizontal, Plus, Square, SquareTerminal } from 'lucide-react'
import { MAX_TERMINALS } from '@shared/constants'
import { useT, withShortcut } from '../../i18n'
import { useShortcutLabel } from '../../keybindings/bindings'
import { cn } from '../../lib/cn'
import { tagDot } from '../../lib/colors'
import { useShellProfiles } from '../../stores/shellProfiles'
import { useTerminals, workspaceTabs, type TerminalTab } from '../../stores/terminals'
import { useUi } from '../../stores/ui'
import { IconButton } from '../ui/Button'
import { Menu } from '../ui/Menu'
import { StatusDot } from '../ui/StatusDot'
import { SidebarSection } from './SidebarSection'

/** "Terminais" section: every open terminal, with new-terminal and layout buttons in the heading. */
export function SidebarTerminals({ collapsed }: { collapsed: boolean }) {
  const { tabs, activeId, layout, focus, open, setLayout } = useTerminals()
  const { view, navigate } = useUi()
  const newShortcut = useShortcutLabel('terminal.new')
  const t = useT()
  const visible = workspaceTabs(tabs)
  const full = tabs.length >= MAX_TERMINALS
  const newLabel = full
    ? t.terminals.limit(MAX_TERMINALS)
    : withShortcut(t.terminals.newTerminal, newShortcut)

  const show = (id: string): void => {
    focus(id)
    navigate('terminals')
  }
  const openNew = (profileId?: string): void => {
    navigate('terminals')
    void open({ profileId })
  }

  const newButton = (
    <IconButton
      label={newLabel}
      disabled={full}
      className={collapsed ? undefined : 'size-6'}
      onClick={() => openNew()}
    >
      <Plus size={14} />
    </IconButton>
  )

  return (
    <SidebarSection
      label={t.terminals.section}
      icon={<SquareTerminal size={16} />}
      collapsed={collapsed}
      active={view === 'terminals'}
      onSelect={() => navigate('terminals')}
      actions={
        <>
          {visible.length > 1 && (
            <IconButton
              label={layout === 'grid' ? t.terminals.showOne : t.terminals.showGrid}
              className="size-6"
              onClick={() => {
                setLayout(layout === 'grid' ? 'single' : 'grid')
                navigate('terminals')
              }}
            >
              {layout === 'grid' ? <Square size={13} /> : <Columns2 size={13} />}
            </IconButton>
          )}
          <ShellMenu disabled={full} onOpen={openNew} />
          {newButton}
        </>
      }
    >
      {visible.map((tab) => {
        const selected = view === 'terminals' && tab.id === activeId
        return collapsed ? (
          <button
            key={tab.id}
            type="button"
            title={tab.title}
            aria-label={tab.title}
            onClick={() => show(tab.id)}
            className={cn(
              'flex size-9 items-center justify-center rounded-md transition-colors hover:bg-raised/60',
              selected && 'bg-raised',
            )}
          >
            <StatusDot className={tab.exitCode === undefined ? tagDot[tab.color] : 'bg-faint'} />
          </button>
        ) : (
          <TerminalItem key={tab.id} tab={tab} selected={selected} onSelect={() => show(tab.id)} />
        )
      })}
      {collapsed
        ? newButton
        : visible.length === 0 && (
            <p className="px-2.5 py-1 text-xs text-faint">{t.terminals.none}</p>
          )}
    </SidebarSection>
  )
}

/** A terminal row: click to show, double-click to rename; ⋯ on hover or right-click for options. */
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
  const t = useT()
  const [editing, setEditing] = useState(false)
  const rowRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={rowRef}
      className={cn(
        // Right padding keeps the title clear of the ⋯ button that appears on hover.
        'group relative flex h-10 items-center gap-3 rounded-md pl-3 pr-9 text-sm transition-colors',
        selected ? 'bg-raised text-fg' : 'text-muted hover:bg-raised/60 hover:text-fg',
      )}
    >
      <StatusDot
        size="md"
        className={tab.exitCode === undefined ? tagDot[tab.color] : 'bg-faint'}
      />
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
          title={`${tab.cwd}\n${t.terminals.renameHint}`}
          className="min-w-0 flex-1 truncate text-left after:absolute after:inset-0"
        >
          {tab.title}
        </button>
      )}
      {!editing && (
        <Menu
          align="right"
          contextTarget={rowRef}
          items={[
            { id: 'rename', label: t.terminals.rename, onSelect: () => setEditing(true) },
            {
              id: 'close',
              label: t.terminals.close,
              danger: true,
              onSelect: () => void close(tab.id),
            },
          ]}
          trigger={({ open, toggle }) => (
            // Just the dots, no button background: the row itself is already highlighted.
            <button
              type="button"
              title={t.terminals.options}
              aria-label={t.terminals.options}
              onClick={toggle}
              className={cn(
                'absolute right-1.5 top-1.5 z-10 inline-flex size-7 items-center justify-center transition-colors hover:text-fg',
                open ? 'text-fg opacity-100' : 'text-muted opacity-0 group-hover:opacity-100',
              )}
            >
              <MoreHorizontal size={15} />
            </button>
          )}
        />
      )}
    </div>
  )
}

/** Lists every installed shell, for opening a terminal other than the default one. */
function ShellMenu({ disabled, onOpen }: { disabled: boolean; onOpen(profileId: string): void }) {
  const { profiles, defaultId } = useShellProfiles()
  const t = useT()

  return (
    <Menu
      items={profiles.map((profile) => ({
        id: profile.id,
        label: profile.name,
        hint: profile.id === defaultId ? t.terminals.defaultShell : undefined,
        onSelect: () => onOpen(profile.id),
      }))}
      trigger={({ open, toggle }) => (
        <IconButton
          label={t.terminals.otherShell}
          disabled={disabled || profiles.length === 0}
          active={open}
          className="size-6"
          onClick={toggle}
        >
          <ChevronDown size={13} />
        </IconButton>
      )}
    />
  )
}
