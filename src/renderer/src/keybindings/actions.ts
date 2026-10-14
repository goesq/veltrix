import { addProject } from '../features/projects/addProject'
import { useTerminals, workspaceTabs } from '../stores/terminals'
import { useUi } from '../stores/ui'
import type { KeyCombo } from './keys'

interface ActionDefinition {
  label: string
  group: 'Geral' | 'Terminais' | 'Projetos'
  /** Default bindings: `mac` uses ⌘ (Meta); `other` keeps plain Ctrl combos free for the shell. */
  defaults: { mac: KeyCombo | null; other: KeyCombo | null }
  run(): void
}

const terminals = () => useTerminals.getState()
const ui = () => useUi.getState()

function openTerminal(): void {
  ui().navigate('terminals')
  void terminals().open()
}

function focusTerminal(position: number): void {
  const tab = workspaceTabs(terminals().tabs)[position - 1]
  if (!tab) return
  ui().navigate('terminals')
  terminals().focus(tab.id)
}

type TabPosition = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
const TAB_POSITIONS: TabPosition[] = [1, 2, 3, 4, 5, 6, 7, 8, 9]

/** One action per tab position (1–9), so each one can be rebound independently. */
const focusActions = Object.fromEntries(
  TAB_POSITIONS.map((position) => [
    `terminal.focus${position}`,
    {
      label: `Ir para o terminal ${position}`,
      group: 'Terminais',
      defaults: { mac: `Meta+${position}`, other: `Ctrl+${position}` },
      run: () => focusTerminal(position),
    },
  ]),
) as Record<`terminal.focus${TabPosition}`, ActionDefinition>

export const actions = {
  'palette.toggle': {
    label: 'Abrir paleta de comandos',
    group: 'Geral',
    defaults: { mac: 'Meta+K', other: 'Ctrl+K' },
    run: () => ui().setPaletteOpen(!ui().paletteOpen),
  },
  'view.terminals': {
    label: 'Mostrar terminais',
    group: 'Geral',
    defaults: { mac: 'Shift+Meta+1', other: 'Ctrl+Shift+1' },
    run: () => ui().navigate('terminals'),
  },
  'view.projects': {
    label: 'Mostrar projetos',
    group: 'Geral',
    defaults: { mac: 'Shift+Meta+2', other: 'Ctrl+Shift+2' },
    run: () => ui().navigate('projects'),
  },
  'view.toggleSidebar': {
    label: 'Recolher / expandir barra lateral',
    group: 'Geral',
    defaults: { mac: 'Meta+B', other: 'Ctrl+Shift+B' },
    run: () => ui().toggleSidebar(),
  },
  'view.settings': {
    label: 'Abrir configurações',
    group: 'Geral',
    defaults: { mac: 'Meta+,', other: 'Ctrl+,' },
    run: () => ui().navigate('settings'),
  },
  'terminal.new': {
    label: 'Novo terminal',
    group: 'Terminais',
    defaults: { mac: 'Meta+T', other: 'Ctrl+Shift+T' },
    run: openTerminal,
  },
  'terminal.close': {
    label: 'Fechar terminal',
    group: 'Terminais',
    defaults: { mac: 'Meta+W', other: 'Ctrl+Shift+W' },
    run: () => {
      const { activeId, close } = terminals()
      if (ui().view === 'terminals' && activeId) void close(activeId)
    },
  },
  'terminal.next': {
    label: 'Próximo terminal',
    group: 'Terminais',
    defaults: { mac: 'Shift+Meta+]', other: 'Ctrl+Tab' },
    run: () => terminals().focusRelative(1),
  },
  'terminal.previous': {
    label: 'Terminal anterior',
    group: 'Terminais',
    defaults: { mac: 'Shift+Meta+[', other: 'Ctrl+Shift+Tab' },
    run: () => terminals().focusRelative(-1),
  },
  'terminal.toggleLayout': {
    label: 'Alternar entre um terminal e grade',
    group: 'Terminais',
    defaults: { mac: 'Shift+Meta+G', other: 'Ctrl+Shift+G' },
    run: () => {
      const { layout, setLayout } = terminals()
      setLayout(layout === 'grid' ? 'single' : 'grid')
    },
  },
  ...focusActions,
  'project.add': {
    label: 'Adicionar projeto',
    group: 'Projetos',
    defaults: { mac: 'Meta+O', other: 'Ctrl+Shift+O' },
    run: () => void addProject(),
  },
} satisfies Record<string, ActionDefinition>

export type ActionId = keyof typeof actions

export const actionIds = Object.keys(actions) as ActionId[]
