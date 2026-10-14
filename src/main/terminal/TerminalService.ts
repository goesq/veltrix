import { homedir } from 'node:os'
import { existsSync } from 'node:fs'
import * as pty from 'node-pty'
import { MAX_TERMINALS } from '@shared/constants'
import type { TerminalCreateOptions, TerminalExit, TerminalInfo } from '@shared/types'
import { childEnv } from '../infra/environment'
import { newId } from '../infra/ids'
import type { ShellProfiles } from './ShellProfiles'

export interface TerminalEvents {
  onData(id: string, data: string): void
  onExit(event: TerminalExit): void
}

export class TerminalLimitError extends Error {
  constructor() {
    super(`You can have at most ${MAX_TERMINALS} terminals open.`)
  }
}

/** Owns the interactive shell sessions shown as terminal tabs. */
export class TerminalService {
  private readonly sessions = new Map<string, pty.IPty>()

  constructor(
    private readonly profiles: ShellProfiles,
    private readonly events: TerminalEvents,
  ) {}

  async create(options: TerminalCreateOptions): Promise<TerminalInfo> {
    if (this.sessions.size >= MAX_TERMINALS) throw new TerminalLimitError()

    const profile = await this.profiles.resolve(options.profileId)
    // Re-check: another terminal may have been created while the profile was resolving.
    if (this.sessions.size >= MAX_TERMINALS) throw new TerminalLimitError()
    const cwd = options.cwd && existsSync(options.cwd) ? options.cwd : homedir()
    const id = newId()
    const session = pty.spawn(profile.file, profile.args, {
      name: 'xterm-256color',
      cols: options.cols,
      rows: options.rows,
      cwd,
      env: childEnv(),
    })

    session.onData((data) => this.events.onData(id, data))
    session.onExit(({ exitCode }) => {
      this.sessions.delete(id)
      this.events.onExit({ id, exitCode })
    })
    this.sessions.set(id, session)

    return { id, pid: session.pid, profile: { id: profile.id, name: profile.name }, cwd }
  }

  write(id: string, data: string): void {
    this.sessions.get(id)?.write(data)
  }

  resize(id: string, cols: number, rows: number): void {
    if (cols < 1 || rows < 1) return
    this.sessions.get(id)?.resize(cols, rows)
  }

  kill(id: string): void {
    const session = this.sessions.get(id)
    if (!session) return
    this.sessions.delete(id)
    session.kill()
  }

  killAll(): void {
    for (const id of [...this.sessions.keys()]) this.kill(id)
  }
}
