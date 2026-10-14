import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ChevronRight, FolderKanban, Plus, SquareTerminal } from 'lucide-react'
import { actionIds, actions } from '../../keybindings/actions'
import { useBindings } from '../../keybindings/bindings'
import { formatCombo } from '../../keybindings/keys'
import { cn } from '../../lib/cn'
import { useProjects } from '../../stores/projects'
import { useShellProfiles } from '../../stores/shellProfiles'
import { useTerminals, workspaceTabs } from '../../stores/terminals'
import { useUi } from '../../stores/ui'

interface Command {
  id: string
  label: string
  hint?: string
  icon: ReactNode
  run(): void
}

/** Actions reachable from the palette (tab positions are listed as the tabs themselves). */
const paletteActions = actionIds.filter(
  (id) => id !== 'palette.toggle' && !id.startsWith('terminal.focus'),
)

/** Quick switcher for actions, shells, open terminals and projects. */
export function CommandPalette() {
  const { paletteOpen, setPaletteOpen, navigate, openProject } = useUi()
  const terminals = useTerminals()
  const projects = useProjects((s) => s.projects)
  const shells = useShellProfiles((s) => s.profiles)
  const bindings = useBindings()
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)

  const commands = useMemo<Command[]>(
    () => [
      ...paletteActions.map((id) => {
        const combo = bindings[id]
        return {
          id,
          label: actions[id].label,
          hint: combo ? formatCombo(combo) : undefined,
          icon: <ChevronRight size={15} />,
          run: actions[id].run,
        }
      }),
      ...shells.map((profile) => ({
        id: `new-terminal-${profile.id}`,
        label: `Novo terminal: ${profile.name}`,
        icon: <Plus size={15} />,
        run: () => {
          navigate('terminals')
          void terminals.open({ profileId: profile.id })
        },
      })),
      ...workspaceTabs(terminals.tabs).map((tab, i) => ({
        id: `terminal-${tab.id}`,
        label: tab.title,
        hint: `Terminal ${i + 1}`,
        icon: <SquareTerminal size={15} />,
        run: () => {
          navigate('terminals')
          terminals.focus(tab.id)
        },
      })),
      ...projects.map((project) => ({
        id: `project-${project.id}`,
        label: project.name,
        hint: 'Projeto',
        icon: <FolderKanban size={15} />,
        run: () => openProject(project.id),
      })),
    ],
    [bindings, terminals, shells, projects, navigate, openProject],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q
      ? commands.filter((c) => `${c.label} ${c.hint ?? ''}`.toLowerCase().includes(q))
      : commands
  }, [commands, query])

  useEffect(() => {
    if (paletteOpen) {
      setQuery('')
      setIndex(0)
    }
  }, [paletteOpen])
  useEffect(() => setIndex(0), [query])

  if (!paletteOpen) return null

  const close = (): void => setPaletteOpen(false)
  const run = (command?: Command): void => {
    if (!command) return
    close()
    command.run()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center bg-black/40 pt-[14vh]"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <div className="h-fit w-full max-w-lg overflow-hidden rounded-lg border border-line bg-panel shadow-lg shadow-black/30">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') close()
            if (e.key === 'ArrowDown') setIndex((i) => Math.min(i + 1, filtered.length - 1))
            if (e.key === 'ArrowUp') setIndex((i) => Math.max(i - 1, 0))
            if (e.key === 'Enter') run(filtered[index])
          }}
          placeholder="Buscar comandos, terminais e projetos…"
          className="h-12 w-full border-b border-line bg-transparent px-4 text-sm placeholder:text-faint focus:outline-none"
        />
        <ul className="max-h-80 overflow-y-auto p-1.5">
          {filtered.length === 0 && <li className="px-3 py-2 text-muted">Nada encontrado.</li>}
          {filtered.map((command, i) => (
            <li key={command.id}>
              <button
                type="button"
                onMouseEnter={() => setIndex(i)}
                onClick={() => run(command)}
                className={cn(
                  'flex h-9 w-full items-center gap-3 rounded-md px-3 text-left',
                  i === index ? 'bg-raised text-fg' : 'text-muted',
                )}
              >
                {command.icon}
                <span className="flex-1 truncate">{command.label}</span>
                {command.hint && <span className="text-xs text-faint">{command.hint}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
