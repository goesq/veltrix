import { delimiter } from 'node:path'

/** Environment for spawned processes: inherit the user's env and advertise a capable terminal. */
export function childEnv(): Record<string, string> {
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) env[key] = value
  }
  env.TERM = 'xterm-256color'
  env.COLORTERM = 'truecolor'
  env.TERM_PROGRAM = 'Veltrix'
  if (process.platform !== 'win32' && !hasUtf8Locale(env)) env.LANG = utf8Locale()
  return env
}

/**
 * Apps opened from the Finder or Dock get no LANG, so shells run in the C locale and count
 * every byte of a multibyte character (like the ➜ in the prompt) as a column. Line editing
 * then thinks the cursor is further right than it is, and long command lines wrap and
 * redraw in the wrong place, most visibly in narrow split panes.
 */
function hasUtf8Locale(env: Record<string, string>): boolean {
  const locale = env.LC_ALL || env.LC_CTYPE || env.LANG
  return !!locale && /utf-?8/i.test(locale)
}

/** The system language as a UTF-8 locale name (pt-BR → pt_BR.UTF-8), en_US when unknown. */
function utf8Locale(): string {
  const [language, region] = Intl.DateTimeFormat().resolvedOptions().locale.split('-')
  return /^[a-z]{2}$/.test(language) && /^[A-Z]{2}$/.test(region ?? '')
    ? `${language}_${region}.UTF-8`
    : 'en_US.UTF-8'
}

/** Puts `dir` first on the PATH of `env`, whichever casing the key has (Windows: `Path`). */
export function prependToPath(env: Record<string, string>, dir: string): void {
  const key = Object.keys(env).find((name) => name.toUpperCase() === 'PATH') ?? 'PATH'
  env[key] = [dir, env[key]].filter(Boolean).join(delimiter)
}
