import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { basename, join } from 'node:path'
import type { ShellProfile, ShellProfileList } from '@shared/types'
import { findOnPath, userShellPath, windowsPowerShellPath } from '../infra/shell'

/** Shell families; the launcher knows how to start each one (see ShellLauncher). */
export type ShellKind = 'powershell' | 'cmd' | 'bash' | 'zsh' | 'wsl' | 'other'

/** A profile plus what is needed to launch it. Never leaves the main process. */
export interface ShellProfileSpec extends ShellProfile {
  kind: ShellKind
  file: string
  /** Arguments that select the shell itself (e.g. the WSL distro), before any integration. */
  baseArgs: string[]
}

/**
 * Detects the shells installed on this machine (once per app run) and resolves which one
 * a new terminal should use. The user's choice of default comes from settings.
 */
export class ShellProfiles {
  private detected?: Promise<ShellProfileSpec[]>

  constructor(private readonly preferredDefaultId: () => string | null) {}

  async list(): Promise<ShellProfileList> {
    const profiles = await this.all()
    return {
      profiles: profiles.map(({ id, name }) => ({ id, name })),
      defaultId: this.defaultOf(profiles).id,
    }
  }

  /** The requested profile, falling back to the default when missing or uninstalled. */
  async resolve(profileId?: string): Promise<ShellProfileSpec> {
    const profiles = await this.all()
    return profiles.find((p) => p.id === profileId) ?? this.defaultOf(profiles)
  }

  private all(): Promise<ShellProfileSpec[]> {
    this.detected ??= process.platform === 'win32' ? detectWindows() : detectPosix()
    return this.detected
  }

  private defaultOf(profiles: ShellProfileSpec[]): ShellProfileSpec {
    return profiles.find((p) => p.id === this.preferredDefaultId()) ?? profiles[0]
  }
}

/** Windows PowerShell first: it is the default unless the user picks another one. */
async function detectWindows(): Promise<ShellProfileSpec[]> {
  const programFiles = process.env.ProgramFiles ?? 'C:\\Program Files'
  const profiles: ShellProfileSpec[] = [
    {
      id: 'powershell',
      name: 'Windows PowerShell',
      kind: 'powershell',
      file: windowsPowerShellPath(),
      baseArgs: [],
    },
  ]

  const pwsh =
    findOnPath('pwsh.exe') ??
    [join(programFiles, 'PowerShell', '7', 'pwsh.exe')].find((path) => existsSync(path))
  if (pwsh) {
    profiles.push({
      id: 'pwsh',
      name: 'PowerShell 7',
      kind: 'powershell',
      file: pwsh,
      baseArgs: [],
    })
  }

  profiles.push({
    id: 'cmd',
    name: 'Prompt de comando',
    kind: 'cmd',
    file: process.env.ComSpec ?? 'cmd.exe',
    baseArgs: [],
  })

  const gitBash = join(programFiles, 'Git', 'bin', 'bash.exe')
  if (existsSync(gitBash)) {
    profiles.push({ id: 'git-bash', name: 'Git Bash', kind: 'bash', file: gitBash, baseArgs: [] })
  }

  for (const distro of await listWslDistributions()) {
    profiles.push({
      id: `wsl:${distro}`,
      name: distro,
      kind: 'wsl',
      file: 'wsl.exe',
      baseArgs: ['-d', distro],
    })
  }
  return profiles
}

/** Installed WSL distributions, skipping Docker Desktop's internal ones. */
function listWslDistributions(): Promise<string[]> {
  return new Promise((resolve) => {
    // `wsl -l -q` writes UTF-16LE; any failure just means WSL isn't available.
    execFile(
      'wsl.exe',
      ['-l', '-q'],
      { encoding: 'utf16le', timeout: 3000, windowsHide: true },
      (error, stdout) => {
        if (error) return resolve([])
        const names = stdout
          .split(/\r?\n/)
          .map((line) => line.replace(/\0/g, '').trim())
          .filter((name) => name && !name.startsWith('docker-desktop'))
        resolve(names)
      },
    )
  })
}

/** The user's login shell first, then other common shells that are installed. */
async function detectPosix(): Promise<ShellProfileSpec[]> {
  const candidates = [
    userShellPath(),
    '/bin/zsh',
    '/bin/bash',
    '/opt/homebrew/bin/fish',
    '/usr/local/bin/fish',
    '/opt/homebrew/bin/nu',
    '/usr/local/bin/nu',
    '/bin/sh',
  ]
  const profiles: ShellProfileSpec[] = []
  for (const file of candidates) {
    const name = basename(file)
    if (!existsSync(file) || profiles.some((p) => p.id === name)) continue
    const kind: ShellKind = name === 'zsh' ? 'zsh' : name === 'bash' ? 'bash' : 'other'
    profiles.push({ id: name, name, kind, file, baseArgs: [] })
  }
  return profiles
}
