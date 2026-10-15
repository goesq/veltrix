import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { userShellPath } from './shell'

const MARKER = '__VELTRIX_ENV__'
const TIMEOUT_MS = 5000

/** Where CLIs commonly install themselves, in case the shell's config doesn't say. */
const FALLBACK_DIRS = [
  join(homedir(), '.local', 'bin'),
  join(homedir(), '.claude', 'local'),
  '/opt/homebrew/bin',
  '/usr/local/bin',
]

let ready: Promise<void> | undefined

/**
 * Apps opened from the Finder or Dock get launchd's bare PATH (/usr/bin:/bin:...), not the
 * one the user's shell config builds, so CLIs installed with Homebrew, npm or their own
 * installer (claude, codex, gemini) can't be found. This reads PATH from an interactive
 * login shell, the way a new terminal window would see it, and merges it into ours, so the
 * planner and agents find the same commands the user's terminal does.
 *
 * Runs once; later calls return the same promise. Never rejects. No-op on Windows, where
 * GUI apps already inherit the user's PATH.
 */
export function loadLoginShellPath(): Promise<void> {
  if (process.platform === 'win32') return Promise.resolve()
  ready ??= readShellPath().then((shellPath) => {
    process.env.PATH = mergePaths(shellPath, process.env.PATH, FALLBACK_DIRS.filter(existsSync))
  })
  return ready
}

function readShellPath(): Promise<string | undefined> {
  // `env` instead of `echo $PATH` so it works the same in fish, where PATH is a list.
  const command = `printf '%s' ${MARKER}; command env; printf '%s' ${MARKER}`
  return new Promise((resolve) => {
    execFile(
      userShellPath(),
      ['-i', '-l', '-c', command],
      // DISABLE_AUTO_UPDATE keeps oh-my-zsh from prompting for an update and hanging.
      { timeout: TIMEOUT_MS, env: { ...process.env, DISABLE_AUTO_UPDATE: 'true' } },
      (_error, stdout) => {
        const env = String(stdout ?? '').split(MARKER)[1] ?? ''
        const line = env.split('\n').find((l) => l.startsWith('PATH='))
        resolve(line?.slice('PATH='.length).trim() || undefined)
      },
    )
  })
}

/** Joins PATH lists in priority order, dropping empty and repeated entries. */
function mergePaths(...lists: (string | string[] | undefined)[]): string {
  const dirs = lists.flatMap((list) => (typeof list === 'string' ? list.split(':') : (list ?? [])))
  return [...new Set(dirs.filter(Boolean))].join(':')
}
