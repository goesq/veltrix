import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { Locale } from '@shared/i18n'
import { childEnv } from '../infra/environment'
import { bannerEnv } from './banner'
import { BASH, CMD_PROMPT, CMD_PROMPT_STYLED, POWERSHELL, ZSH_FILES } from './shellIntegration'
import type { ShellKind, ShellProfileSpec } from './ShellProfiles'

export interface LaunchSpec {
  file: string
  args: string[]
  env: Record<string, string>
  cwd: string
}

/** Terminal settings that shape a launch, read fresh for every new terminal. */
export interface LaunchPreferences {
  /** Folder for terminals that don't ask for one; null means home. */
  defaultCwd: string | null
  /** Use the Veltrix prompt instead of the user's own. */
  prompt: boolean
  /** Print the Veltrix banner when the shell starts. */
  banner: boolean
  /** Language of the banner. */
  locale: Locale
}

/** Shells whose integration script can print the banner. */
const BANNER_SHELLS: ShellKind[] = ['powershell', 'bash', 'zsh']

/**
 * Turns a shell profile into a concrete process launch, with shell integration so the
 * terminal learns the working directory (used to restore terminals where they were).
 * Shells without integration (fish, nushell, WSL) still work; they just don't report it.
 */
export class ShellLauncher {
  private readonly bashInit: string
  private readonly zshDir: string

  /**
   * @param integrationDir Writable folder for the integration scripts (in userData).
   * @param preferences Current terminal settings.
   * @param version App version, shown in the banner.
   */
  constructor(
    integrationDir: string,
    private readonly preferences: () => LaunchPreferences,
    private readonly version: string,
  ) {
    this.bashInit = join(integrationDir, 'veltrix.bash')
    this.zshDir = join(integrationDir, 'zsh')
    mkdirSync(this.zshDir, { recursive: true })
    writeFileSync(this.bashInit, BASH, 'utf8')
    for (const [name, content] of Object.entries(ZSH_FILES)) {
      writeFileSync(join(this.zshDir, name), content, 'utf8')
    }
  }

  launch(profile: ShellProfileSpec, requestedCwd?: string): LaunchSpec {
    const env = childEnv()
    const args = [...profile.baseArgs]
    const { prompt, banner, locale } = this.preferences()
    let cwd = requestedCwd && existsSync(requestedCwd) ? requestedCwd : this.startFolder()
    if (prompt) env.VELTRIX_PROMPT = '1'
    if (banner && BANNER_SHELLS.includes(profile.kind)) {
      Object.assign(env, bannerEnv({ version: this.version, shell: profile.name, locale }))
    }

    switch (profile.kind) {
      case 'powershell':
        args.push('-NoLogo', '-NoExit', '-EncodedCommand', encodePowerShell(POWERSHELL))
        break
      case 'cmd':
        env.PROMPT = prompt ? CMD_PROMPT_STYLED : CMD_PROMPT
        break
      case 'bash':
        // Forward slashes work for both Git Bash (MSYS) and native bash.
        args.push('--init-file', this.bashInit.replaceAll('\\', '/'), '-i')
        env.VELTRIX_SHELL_LOGIN = '1'
        break
      case 'zsh':
        args.push('-l')
        env.VELTRIX_USER_ZDOTDIR = env.ZDOTDIR || homedir()
        env.ZDOTDIR = this.zshDir
        break
      case 'wsl':
        // WSL paths (/home/...) don't exist on the Windows side; wsl.exe changes into them.
        // Otherwise it starts in the Windows folder it's launched from, under /mnt.
        if (requestedCwd?.startsWith('/')) args.push('--cd', requestedCwd)
        cwd = this.startFolder()
        break
      case 'other':
        args.push(profile.id === 'nu' ? '--login' : '-l')
        break
    }
    return { file: profile.file, args, env, cwd }
  }

  /** Where a terminal starts when it has no folder of its own: the default from settings, or home. */
  private startFolder(): string {
    const folder = this.preferences().defaultCwd
    return folder && existsSync(folder) ? folder : homedir()
  }
}

/** PowerShell's -EncodedCommand takes Base64 of UTF-16LE, which sidesteps all quoting. */
function encodePowerShell(script: string): string {
  return Buffer.from(script, 'utf16le').toString('base64')
}
