import type { BrowserWindow } from 'electron'
import type { ShellLauncher } from './terminal/ShellLauncher'
import type { ShellKind, ShellProfiles } from './terminal/ShellProfiles'
import { TerminalService } from './terminal/TerminalService'

/**
 * `--smoke-test`: checks that a packaged build really works on this machine, then exits
 * (0 when every check passes). CI runs it on each installer before publishing it; it also
 * runs locally: `Veltrix --smoke-test` from a terminal.
 *
 * Checks that the interface loads, and that the default shell starts in a pty (native
 * node-pty binary, spawn-helper on macOS), runs a command and prints the banner.
 */
export const SMOKE_TEST_FLAG = '--smoke-test'

const TIMEOUT_MS = 30_000
const MARKER = 'veltrix-smoke-ok'

/** A command that prints MARKER without the typed text containing it, so the echo of the input can't pass for output. */
const PRINT_MARKER: Partial<Record<ShellKind, string>> = {
  powershell: `Write-Output ('veltrix' + '-smoke-ok')`,
  cmd: 'echo veltrix^-smoke-ok',
}
const PRINT_MARKER_POSIX = `echo veltrix''-smoke-ok`

/** Shells whose integration prints the banner (ShellLauncher.BANNER_SHELLS). */
const BANNER_KINDS: ShellKind[] = ['powershell', 'bash', 'zsh']

interface SmokeTestDeps {
  window: BrowserWindow
  profiles: ShellProfiles
  launcher: ShellLauncher
  version: string
}

export async function runSmokeTest(deps: SmokeTestDeps): Promise<number> {
  const steps: [string, () => Promise<void>][] = [
    ['interface loads', () => checkInterface(deps.window)],
    ['shell runs in a terminal', () => checkTerminal(deps)],
  ]
  let failed = false
  for (const [name, step] of steps) {
    try {
      await withTimeout(step(), name)
      console.log(`smoke test: ok   ${name}`)
    } catch (error) {
      failed = true
      console.error(`smoke test: FAIL ${name}: ${error instanceof Error ? error.message : error}`)
    }
  }
  return failed ? 1 : 0
}

async function checkInterface(window: BrowserWindow): Promise<void> {
  const contents = window.webContents
  if (contents.isLoading()) {
    await new Promise<void>((resolve, reject) => {
      contents.once('did-finish-load', () => resolve())
      contents.once('did-fail-load', (_e, code, description) =>
        reject(new Error(`page failed to load (${code} ${description})`)),
      )
      contents.once('render-process-gone', (_e, details) =>
        reject(new Error(`renderer exited (${details.reason})`)),
      )
    })
  }
  // React mounts asynchronously; give it a moment before looking at the DOM.
  for (let attempt = 0; attempt < 50; attempt++) {
    const mounted: boolean = await contents.executeJavaScript(
      `(document.getElementById('root')?.childElementCount ?? 0) > 0`,
    )
    if (mounted) return
    await delay(100)
  }
  throw new Error('the interface rendered nothing')
}

async function checkTerminal({ profiles, launcher, version }: SmokeTestDeps): Promise<void> {
  const profile = await profiles.resolve()
  let output = ''
  let exited: number | null = null
  const terminals = new TerminalService(profiles, launcher, {
    onData: (_id, data) => (output += data),
    onExit: (event) => (exited = event.exitCode),
  })
  const { id } = await terminals.create({ cols: 120, rows: 30 })
  try {
    const command = PRINT_MARKER[profile.kind] ?? PRINT_MARKER_POSIX
    // Shells ignore input typed before their prompt is ready, so keep retyping until it shows.
    for (let attempt = 0; attempt < 20 && !output.includes(MARKER); attempt++) {
      if (exited !== null) {
        throw new Error(`${profile.name} exited with code ${exited}. Output:\n${output}`)
      }
      terminals.write(id, `${command}\r`)
      await delay(1000)
    }
    if (!output.includes(MARKER)) {
      throw new Error(`${profile.name} (${profile.file}) never ran the command. Output:\n${output}`)
    }
    if (BANNER_KINDS.includes(profile.kind) && !output.includes(`v${version}`)) {
      throw new Error(`${profile.name} started without the banner. Output:\n${output}`)
    }
    console.log(`smoke test:      shell: ${profile.name} (${profile.file})`)
  } finally {
    terminals.killAll()
  }
}

function withTimeout(promise: Promise<void>, name: string): Promise<void> {
  return Promise.race([
    promise,
    delay(TIMEOUT_MS).then(() => {
      throw new Error(`${name} took longer than ${TIMEOUT_MS / 1000}s`)
    }),
  ])
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
