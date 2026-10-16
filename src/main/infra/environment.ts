import { delimiter } from 'node:path'

/** Environment for spawned processes: inherit the user's env and advertise a capable terminal. */
export function childEnv(): Record<string, string> {
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) env[key] = value
  }
  env.TERM = 'xterm-256color'
  env.COLORTERM = 'truecolor'
  env.TERM_PROGRAM = 'Veltrix'
  return env
}

/** Puts `dir` first on the PATH of `env`, whichever casing the key has (Windows: `Path`). */
export function prependToPath(env: Record<string, string>, dir: string): void {
  const key = Object.keys(env).find((name) => name.toUpperCase() === 'PATH') ?? 'PATH'
  env[key] = [dir, env[key]].filter(Boolean).join(delimiter)
}
