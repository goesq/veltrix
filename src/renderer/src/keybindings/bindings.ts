import { isMac } from '../lib/api'
import { useSettings } from '../stores/settings'
import { actionIds, actions, type ActionId } from './actions'
import { formatCombo, type KeyCombo } from './keys'

export type Bindings = Record<ActionId, KeyCombo | null>

/** User overrides as stored in settings; `null` means the action was unbound on purpose. */
export type BindingOverrides = Partial<Record<ActionId, KeyCombo | null>>

export function defaultBinding(id: ActionId): KeyCombo | null {
  return isMac ? actions[id].defaults.mac : actions[id].defaults.other
}

export function resolveBindings(overrides: BindingOverrides): Bindings {
  return Object.fromEntries(
    actionIds.map((id) => [id, id in overrides ? (overrides[id] ?? null) : defaultBinding(id)]),
  ) as Bindings
}

export function currentOverrides(): BindingOverrides {
  return (useSettings.getState().settings?.keybindings ?? {}) as BindingOverrides
}

/** Effective bindings, reactive to settings changes. */
export function useBindings(): Bindings {
  const overrides = useSettings((s) => s.settings?.keybindings) as BindingOverrides | undefined
  return resolveBindings(overrides ?? {})
}

/** Display label of an action's shortcut, e.g. "Ctrl+Shift+T", or undefined when unbound. */
export function useShortcutLabel(id: ActionId): string | undefined {
  const combo = useBindings()[id]
  return combo ? formatCombo(combo) : undefined
}
