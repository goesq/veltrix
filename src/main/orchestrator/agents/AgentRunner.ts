import * as pty from 'node-pty'
import { childEnv } from '../../infra/environment'
import { commandShell } from '../../infra/shell'

export interface AgentRun {
  /** Resolves with the process exit code once the agent finishes or is killed. */
  readonly exited: Promise<number>
  kill(): void
}

export interface AgentRunOptions {
  cwd: string
  commandLine: string
  onData(data: string): void
}

/**
 * Runs a headless agent command inside a pseudo-terminal, so CLIs keep their colors
 * and progress output exactly as they would in a real terminal.
 */
export class AgentRunner {
  start({ cwd, commandLine, onData }: AgentRunOptions): AgentRun {
    const shell = commandShell()
    const process = pty.spawn(shell.file, shell.commandArgs(commandLine), {
      name: 'xterm-256color',
      cols: 120,
      rows: 32,
      cwd,
      env: childEnv(),
    })

    process.onData(onData)
    const exited = new Promise<number>((resolve) => {
      process.onExit(({ exitCode }) => resolve(exitCode))
    })

    return { exited, kill: () => process.kill() }
  }
}
