/** Languages the interface is translated into. */
export const LOCALES = ['pt-BR', 'en-US'] as const

export type Locale = (typeof LOCALES)[number]

/** Language of a fresh install, and of the interface until settings have loaded. */
export const DEFAULT_LOCALE: Locale = 'en-US'

/** Each language's name in that language, for the language picker. */
export const LOCALE_NAMES: Record<Locale, string> = {
  'pt-BR': 'Português (Brasil)',
  'en-US': 'English (United States)',
}

/**
 * The language to use: the user's choice, or else the first system language we have a
 * translation for (any Portuguese variant maps to pt-BR), falling back to English.
 */
export function resolveLocale(
  preference: Locale | null,
  systemLanguages: readonly string[],
): Locale {
  if (preference) return preference
  for (const language of systemLanguages) {
    const tag = language.toLowerCase()
    if (tag.startsWith('pt')) return 'pt-BR'
    if (tag.startsWith('en')) return 'en-US'
  }
  return 'en-US'
}
