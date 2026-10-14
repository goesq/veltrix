import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { childEnv } from '../infra/environment'
import { BASH, CMD_PROMPT, POWERSHELL, ZSH_FILES } from './shellIntegration'
import type { ShellProfileSpec } from './ShellProfiles'

export interface LaunchSpec {
  file: string
  args: string[]
  env: Record<string, string>
  cwd: string
}

/**
 * Turns a shell profile into a concrete process launch, with shell integration so the
 * terminal learns the working directory (used to restore terminals where they were).
 * Shells without integration (fish, nushell, WSL) still work; they just don't report it.
 */
export class ShellLauncher {
  private readonly bashInit: string
  private readonly zshDir: string

  /** @param integrationDir Writable folder for the integration scripts (in userData). */
  constructor(integrationDir: string) {
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
    let cwd = requestedCwd && existsSync(requestedCwd) ? requestedCwd : homedir()

    switch (profile.kind) {
      case 'powershell':
        args.push('-NoLogo', '-NoExit', '-EncodedCommand', encodePowerShell(POWERSHELL))
        break
      case 'cmd':
        env.PROMPT = CMD_PROMPT
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
        if (requestedCwd?.startsWith('/')) args.push('--cd', requestedCwd)
        cwd = homedir()
        break
      case 'other':
        args.push(profile.id === 'nu' ? '--login' : '-l')
        break
    }
    return { file: profile.file, args, env, cwd }
  }
}

/** PowerShell's -EncodedCommand takes Base64 of UTF-16LE, which sidesteps all quoting. */
function encodePowerShell(script: string): string {
  return Buffer.from(script, 'utf16le').toString('base64')
}
