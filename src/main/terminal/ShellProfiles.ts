import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { basename, join } from 'node:path'
import type { ShellProfile, ShellProfileList } from '@shared/types'
import { findOnPath, userShellPath, windowsPowerShellPath } from '../infra/shell'

/** A profile plus how to launch it. Launch details never leave the main process. */
export interface ShellProfileSpec extends ShellProfile {
  file: string
  args: string[]
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
  const profiles: ShellProfileSpec[] = [
    { id: 'powershell', name: 'Windows PowerShell', file: windowsPowerShellPath(), args: ['-NoLogo'] },
  ]

  const pwsh =
    findOnPath('pwsh.exe') ??
    [join(process.env.ProgramFiles ?? 'C:\\Program Files', 'PowerShell', '7', 'pwsh.exe')].find(
      existsSync,
    )
  if (pwsh) profiles.push({ id: 'pwsh', name: 'PowerShell 7', file: pwsh, args: ['-NoLogo'] })

  profiles.push({
    id: 'cmd',
    name: 'Prompt de comando',
    file: process.env.ComSpec ?? 'cmd.exe',
    args: [],
  })

  const gitBash = join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Git', 'bin', 'bash.exe')
  if (existsSync(gitBash)) {
    profiles.push({ id: 'git-bash', name: 'Git Bash', file: gitBash, args: ['--login', '-i'] })
  }

  for (const distro of await listWslDistributions()) {
    profiles.push({ id: `wsl:${distro}`, name: distro, file: 'wsl.exe', args: ['-d', distro] })
  }
  return profiles
}

/** Installed WSL distributions, skipping Docker Desktop's internal ones. */
function listWslDistributions(): Promise<string[]> {
  return new Promise((resolve) => {
    // `wsl -l -q` writes UTF-16LE; any failure just means WSL isn't available.
    execFile('wsl.exe', ['-l', '-q'], { encoding: 'utf16le', timeout: 3000, windowsHide: true }, (error, stdout) => {
      if (error) return resolve([])
      const names = stdout
        .split(/\r?\n/)
        .map((line) => line.replace(/\0/g, '').trim())
        .filter((name) => name && !name.startsWith('docker-desktop'))
      resolve(names)
    })
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
    // Login shell so GUI-launched apps still get the user's PATH (Homebrew, nvm, ...).
    profiles.push({ id: name, name, file, args: name === 'nu' ? ['--login'] : ['-l'] })
  }
  return profiles
}
