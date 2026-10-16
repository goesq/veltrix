import { existsSync } from 'node:fs'
import { join } from 'node:path'

/** Shell used to run one-off command lines (agent runs), never shown as a tab. */
export interface CommandShell {
  file: string
  /** Builds the arguments that run a single command line and exit. */
  commandArgs(commandLine: string): string[]
  /** Quotes a value so the shell treats it as one literal argument. */
  quote(value: string): string
}

const isWindows = process.platform === 'win32'

export function findOnPath(executable: string): string | undefined {
  const dirs = (process.env.PATH ?? '').split(isWindows ? ';' : ':')
  return dirs.map((dir) => join(dir, executable)).find((candidate) => existsSync(candidate))
}

/** Whether a command (`claude`, `codex`...) resolves on PATH, including Windows' `.cmd` shims. */
export function isOnPath(command: string): boolean {
  const extensions = isWindows
    ? (process.env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean)
    : ['']
  return extensions.some((extension) => findOnPath(command + extension) !== undefined)
}

/** Absolute path of Windows PowerShell, which ships with every supported Windows version. */
export function windowsPowerShellPath(): string {
  const systemRoot = process.env.SystemRoot ?? 'C:\\Windows'
  return join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
}

/** The user's login shell on macOS / Linux. */
export function userShellPath(): string {
  return process.env.SHELL || (process.platform === 'darwin' ? '/bin/zsh' : '/bin/bash')
}

function powershell(): CommandShell {
  return {
    file: windowsPowerShellPath(),
    commandArgs: (commandLine) => ['-NoLogo', '-NoProfile', '-Command', commandLine],
    quote: (value) => `'${value.replace(/'/g, "''")}'`,
  }
}

function posixShell(): CommandShell {
  return {
    file: userShellPath(),
    // Login shell so GUI-launched apps still get the user's PATH (Homebrew, nvm, ...).
    commandArgs: (commandLine) => ['-l', '-c', commandLine],
    quote: (value) => `'${value.replace(/'/g, "'\\''")}'`,
  }
}

let cached: CommandShell | undefined

export function commandShell(): CommandShell {
  cached ??= isWindows ? powershell() : posixShell()
  return cached
}
