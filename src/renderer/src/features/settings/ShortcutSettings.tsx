import { useEffect, useState } from 'react'
import { RotateCcw, X } from 'lucide-react'
import { Button, IconButton } from '../../components/ui/Button'
import { useT } from '../../i18n'
import { cn } from '../../lib/cn'
import {
  actionIds,
  actionLabel,
  actions,
  type ActionGroup,
  type ActionId,
} from '../../keybindings/actions'
import {
  currentOverrides,
  defaultBinding,
  useBindings,
  type BindingOverrides,
} from '../../keybindings/bindings'
import { comboFromEvent, formatCombo, isBindable, type KeyCombo } from '../../keybindings/keys'
import { useSettings } from '../../stores/settings'
import { useUi } from '../../stores/ui'

const groups: ActionGroup[] = ['general', 'terminals', 'projects']

/** Lists every action with its shortcut; click one to record a new combination. */
export function ShortcutSettings() {
  const bindings = useBindings()
  const update = useSettings((s) => s.update)
  const t = useT()
  const [recording, setRecording] = useState<ActionId | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const save = async (overrides: BindingOverrides): Promise<void> => {
    await update({ keybindings: overrides })
  }

  const assign = (id: ActionId, combo: KeyCombo | null): Promise<void> => {
    const overrides = { ...currentOverrides() }
    if (combo === defaultBinding(id)) delete overrides[id]
    else overrides[id] = combo
    return save(overrides)
  }

  const reset = (id: ActionId): Promise<void> => {
    const overrides = { ...currentOverrides() }
    delete overrides[id]
    return save(overrides)
  }

  useEffect(() => {
    useUi.getState().setRecordingShortcut(recording !== null)
    if (!recording) return

    const stop = (): void => {
      setRecording(null)
      setMessage(null)
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      event.preventDefault()
      event.stopPropagation()
      const plain = !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey
      if (plain && event.key === 'Escape') return stop()
      if (plain && (event.key === 'Backspace' || event.key === 'Delete')) {
        void assign(recording, null).then(stop)
        return
      }

      const combo = comboFromEvent(event)
      if (!combo) return
      if (!isBindable(combo)) {
        setMessage(t.shortcuts.needsModifier)
        return
      }
      const owner = actionIds.find((id) => id !== recording && bindings[id] === combo)
      if (owner) {
        setMessage(t.shortcuts.inUse(formatCombo(combo), actionLabel(owner, t)))
        return
      }
      void assign(recording, combo).then(stop)
    }

    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
    // `assign` reads fresh overrides on every call; `bindings` is needed for conflicts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording, bindings, t])

  // Never leave global shortcuts paused when leaving the page mid-recording.
  useEffect(() => () => useUi.getState().setRecordingShortcut(false), [])

  const hasOverrides = Object.keys(currentOverrides()).length > 0

  return (
    <div className="flex flex-col gap-5">
      <p className="text-muted">
        {t.shortcuts.instructions} <Kbd>Esc</Kbd> {t.shortcuts.escCancels}, <Kbd>Backspace</Kbd>{' '}
        {t.shortcuts.backspaceRemoves}.
      </p>

      {groups.map((group) => (
        <div key={group} className="flex flex-col">
          <h3 className="pb-1.5 text-xs text-faint">{t.actions.groups[group]}</h3>
          <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
            {actionIds
              .filter((id) => actions[id].group === group)
              .map((id) => {
                const combo = bindings[id]
                const isRecording = recording === id
                const customized = combo !== defaultBinding(id)
                return (
                  <li key={id} className="group flex flex-col">
                    <div className="flex h-10 items-center gap-3 px-3">
                      <span className="flex-1 truncate">{actionLabel(id, t)}</span>
                      {customized && !isRecording && (
                        <IconButton label={t.shortcuts.reset} onClick={() => void reset(id)}>
                          <RotateCcw size={13} />
                        </IconButton>
                      )}
                      {combo && !isRecording && (
                        <IconButton
                          label={t.shortcuts.remove}
                          className="opacity-0 group-hover:opacity-100"
                          onClick={() => void assign(id, null)}
                        >
                          <X size={13} />
                        </IconButton>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setMessage(null)
                          setRecording(isRecording ? null : id)
                        }}
                        className={cn(
                          'h-7 min-w-28 rounded-md border px-2.5 text-right font-mono text-xs transition-colors',
                          isRecording
                            ? 'border-line-strong bg-raised text-fg'
                            : 'border-line text-muted hover:border-line-strong hover:text-fg',
                        )}
                      >
                        {isRecording ? t.shortcuts.recording : combo ? formatCombo(combo) : '—'}
                      </button>
                    </div>
                    {isRecording && message && (
                      <p className="px-3 pb-2.5 text-xs text-warning">{message}</p>
                    )}
                  </li>
                )
              })}
          </ul>
        </div>
      ))}

      <div className="flex justify-end">
        <Button variant="ghost" disabled={!hasOverrides} onClick={() => void save({})}>
          {t.shortcuts.resetAll}
        </Button>
      </div>
    </div>
  )
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="rounded border border-line px-1 font-mono text-[11px] text-fg">{children}</kbd>
  )
}
