/**
 * Data for the "veltrix" banner shown when a terminal starts and after every `clear`.
 * The shell draws it (see shellIntegration.ts), because only the shell knows its current
 * folder, branch and width when it clears; this module supplies the parts that never change.
 */

import type { Locale } from '@shared/i18n'

export interface BannerInfo {
  version: string
  /** Shell profile name, e.g. "Windows PowerShell". */
  shell: string
  locale: Locale
}

/** The banner's own words. Labels stay within 6 characters: the shells pad them to that. */
const TEXT: Record<Locale, { folder: string; search: string; newTerminal: string }> = {
  'pt-BR': { folder: 'pasta', search: 'busca', newTerminal: 'novo terminal' },
  'en-US': { folder: 'folder', search: 'search', newTerminal: 'new terminal' },
}

/** "veltrix" in the ANSI Shadow figlet font. */
const WORDMARK = [
  '██╗   ██╗███████╗██╗  ████████╗██████╗ ██╗██╗  ██╗',
  '██║   ██║██╔════╝██║  ╚══██╔══╝██╔══██╗██║╚██╗██╔╝',
  '██║   ██║█████╗  ██║     ██║   ██████╔╝██║ ╚███╔╝ ',
  '╚██╗ ██╔╝██╔══╝  ██║     ██║   ██╔══██╗██║ ██╔██╗ ',
  ' ╚████╔╝ ███████╗███████╗██║   ██║  ██║██║██╔╝ ██╗',
  '  ╚═══╝  ╚══════╝╚══════╝╚═╝   ╚═╝  ╚═╝╚═╝╚═╝  ╚═╝',
]

/** Columns the wordmark needs; narrower terminals get the details only. */
export const WORDMARK_COLUMNS = [...WORDMARK[0]].length

/** The gradient runs from the terminal theme's green to its blue (terminalTheme.ts). */
const FROM = [147, 184, 143]
const TO = [125, 159, 196]

const ESC = '\x1b'

/** Environment variables the shell integration reads once at startup (and then unsets). */
export function bannerEnv({ version, shell, locale }: BannerInfo): Record<string, string> {
  const text = TEXT[locale]
  const [search, newTerminal] =
    process.platform === 'darwin' ? ['⌘K', '⌘T'] : ['Ctrl+K', 'Ctrl+Shift+T']
  return {
    VELTRIX_BANNER_ART: paintGradient(WORDMARK).join('\n'),
    VELTRIX_BANNER_VERSION: version,
    VELTRIX_BANNER_SHELL: shell,
    VELTRIX_BANNER_FOLDER: text.folder,
    VELTRIX_BANNER_TIP: `${search} ${text.search} · ${newTerminal} ${text.newTerminal}`,
  }
}

/** Colors each column along the gradient, so all rows line up in the same hue. */
function paintGradient(lines: string[]): string[] {
  const width = Math.max(...lines.map((line) => [...line].length))
  return lines.map((line) => {
    let out = ''
    let current = ''
    ;[...line].forEach((char, column) => {
      if (char === ' ') {
        out += char
        return
      }
      const color = rgbAt(width > 1 ? column / (width - 1) : 0)
      if (color !== current) out += color
      current = color
      out += char
    })
    return `${out}${ESC}[0m`
  })
}

function rgbAt(t: number): string {
  const [r, g, b] = FROM.map((from, i) => Math.round(from + (TO[i] - from) * t))
  return `${ESC}[38;2;${r};${g};${b}m`
}
