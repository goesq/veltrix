import { DEFAULT_LOCALE, resolveLocale, type Locale } from '@shared/i18n'
import type { Settings } from '@shared/types'
import { useSettings } from '../stores/settings'
import { enUS } from './en-US'
import { ptBR, type Messages } from './pt-BR'

export type { Messages }

const catalogs: Record<Locale, Messages> = { 'pt-BR': ptBR, 'en-US': enUS }

/** The language chosen in settings (or the system's, on "automatic"); English until they load. */
function localeOf(settings: Settings | null): Locale {
  return settings ? resolveLocale(settings.language, navigator.languages) : DEFAULT_LOCALE
}

/** The interface language; components re-render when it changes. */
export function useLocale(): Locale {
  return localeOf(useSettings((s) => s.settings))
}

/** The strings for the current language; components re-render when it changes. */
export function useT(): Messages {
  return catalogs[useLocale()]
}

/** The strings for the current language, for code outside React components. */
export function messages(): Messages {
  return catalogs[localeOf(useSettings.getState().settings)]
}

/** A label with its shortcut in parentheses, e.g. "New terminal (Ctrl+Shift+T)". */
export function withShortcut(label: string, shortcut: string | undefined): string {
  return shortcut ? `${label} (${shortcut})` : label
}

// Keep <html lang> in step, for screen readers and the spell checker.
document.documentElement.lang = DEFAULT_LOCALE
useSettings.subscribe((state) => {
  document.documentElement.lang = localeOf(state.settings)
})
