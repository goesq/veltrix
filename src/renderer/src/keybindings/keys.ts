import { isMac } from '../lib/api'

/**
 * A key combination in canonical form: modifiers in a fixed order, then one key,
 * joined by "+" (e.g. "Ctrl+Shift+T", "Meta+1"). Stored in settings as-is.
 */
export type KeyCombo = string

const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta', 'AltGraph', 'CapsLock'])

/** Names for physical keys whose `event.key` varies with Shift or the keyboard layout. */
const CODE_NAMES: Record<string, string> = {
  BracketLeft: '[',
  BracketRight: ']',
  Comma: ',',
  Period: '.',
  Slash: '/',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Backquote: '`',
  Minus: '-',
  Equal: '=',
  Space: 'Space',
}

function keyName(event: KeyboardEvent): string {
  const { code } = event
  if (code.startsWith('Key')) return code.slice(3)
  if (code.startsWith('Digit')) return code.slice(5)
  if (code.startsWith('Numpad') && /\d$/.test(code)) return code.slice(6)
  return CODE_NAMES[code] ?? (event.key.length === 1 ? event.key.toUpperCase() : event.key)
}

/** The combo for a keydown, or null while only modifiers are held. */
export function comboFromEvent(event: KeyboardEvent): KeyCombo | null {
  if (MODIFIER_KEYS.has(event.key)) return null
  const parts: string[] = []
  if (event.ctrlKey) parts.push('Ctrl')
  if (event.altKey) parts.push('Alt')
  if (event.shiftKey) parts.push('Shift')
  if (event.metaKey) parts.push('Meta')
  parts.push(keyName(event))
  return parts.join('+')
}

/**
 * Whether a combo may be bound. It needs Ctrl, Alt or ⌘ (or be a function key),
 * otherwise it would swallow ordinary typing in the terminal.
 */
export function isBindable(combo: KeyCombo): boolean {
  const parts = combo.split('+')
  const key = parts[parts.length - 1]
  if (/^F\d{1,2}$/.test(key)) return true
  return parts.some((part) => part === 'Ctrl' || part === 'Alt' || part === 'Meta')
}

const MAC_SYMBOLS: Record<string, string> = { Ctrl: '⌃', Alt: '⌥', Shift: '⇧', Meta: '⌘' }
const KEY_SYMBOLS: Record<string, string> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Enter: '↵',
}

/** Human-readable combo in each platform's convention ("⌘⇧T" / "Ctrl+Shift+T"). */
export function formatCombo(combo: KeyCombo): string {
  const parts = combo.split('+').map((part) => KEY_SYMBOLS[part] ?? part)
  return isMac ? parts.map((part) => MAC_SYMBOLS[part] ?? part).join('') : parts.join('+')
}
