import { useEffect } from 'react'
import { useUi } from '../stores/ui'
import { actions, type ActionId } from './actions'
import { currentOverrides, resolveBindings } from './bindings'
import { comboFromEvent } from './keys'

/**
 * Runs the action bound to each keydown. Listens in the capture phase so shortcuts win over
 * the focused terminal; keys that aren't bound keep flowing to the shell untouched.
 */
export function useShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (useUi.getState().recordingShortcut) return
      const combo = comboFromEvent(event)
      if (!combo) return

      const bindings = resolveBindings(currentOverrides())
      const id = (Object.keys(bindings) as ActionId[]).find((action) => bindings[action] === combo)
      if (!id) return

      event.preventDefault()
      event.stopPropagation()
      // Any other action takes the user somewhere else, so the palette shouldn't linger on top.
      if (id !== 'palette.toggle') useUi.getState().setPaletteOpen(false)
      actions[id].run()
    }

    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
  }, [])
}
