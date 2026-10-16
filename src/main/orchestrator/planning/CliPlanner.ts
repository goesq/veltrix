import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { z } from 'zod/v4'
import type { PlannerEngine } from '@shared/ai'
import { childEnv } from '../../infra/environment'
import { loadLoginShellPath } from '../../infra/loginShellPath'
import { parsePlanText, type Plan, type Planner, type PlanRequest } from './Planner'
import { buildJsonPlannerPrompt, PLANNER_SYSTEM_PROMPT } from './planPrompt'

/** How one CLI is run headless and where its final reply ends up. */
interface CliProtocol {
  binary: string
  /** Arguments for a one-shot, read-only run that takes the prompt from stdin. */
  args(options: { model?: string; replyFile: string }): string[]
  /** Pulls the model's reply out of what the CLI printed (or wrote to `replyFile`). */
  reply(stdout: string, replyFile: string): Promise<string>
}

const ClaudeResultSchema = z.object({
  is_error: z.boolean().optional(),
  result: z.string().optional(),
})

const GeminiResultSchema = z.object({ response: z.string() })

const PROTOCOLS: Partial<Record<PlannerEngine, CliProtocol>> = {
  'claude-cli': {
    binary: 'claude',
    args: ({ model }) => ['-p', '--output-format', 'json', ...(model ? ['--model', model] : [])],
    reply: async (stdout) => {
      const result = ClaudeResultSchema.parse(JSON.parse(stdout))
      if (result.is_error) throw new Error(result.result || 'Claude CLI reported an error.')
      return result.result ?? ''
    },
  },
  'codex-cli': {
    binary: 'codex',
    // `-` reads the prompt from stdin; the last message goes to a file, away from the logs.
    args: ({ model, replyFile }) => [
      'exec',
      '--sandbox',
      'read-only',
      '--skip-git-repo-check',
      '--output-last-message',
      quoteArg(replyFile),
      ...(model ? ['--model', model] : []),
      '-',
    ],
    reply: (_stdout, replyFile) => readFile(replyFile, 'utf8'),
  },
  'gemini-cli': {
    binary: 'gemini',
    // Piped stdin runs Gemini CLI non-interactively, with its default (read-only) approvals.
    args: ({ model }) => ['--output-format', 'json', ...(model ? ['--model', model] : [])],
    reply: async (stdout) => {
      try {
        return GeminiResultSchema.parse(JSON.parse(stdout)).response
      } catch {
        return stdout
      }
    },
  },
}

/**
 * Plans through a locally installed agent CLI, reusing the user's existing login, so no
 * API key is required. The prompt goes through stdin to avoid shell-quoting issues
 * across platforms.
 */
export class CliPlanner implements Planner {
  private readonly protocol: CliProtocol

  constructor(
    engine: PlannerEngine,
    private readonly model?: string,
  ) {
    const protocol = PROTOCOLS[engine]
    if (!protocol) throw new Error(`"${engine}" is not a CLI planner.`)
    this.protocol = protocol
  }

  async plan(request: PlanRequest): Promise<Plan> {
    const prompt = `${PLANNER_SYSTEM_PROMPT}\n\n${buildJsonPlannerPrompt(request)}`
    const dir = await mkdtemp(join(tmpdir(), 'veltrix-plan-'))
    try {
      const replyFile = join(dir, 'reply.txt')
      const stdout = await this.run(
        this.protocol.args({ model: this.model, replyFile }),
        request.project.path,
        prompt,
      )
      return parsePlanText(await this.protocol.reply(stdout, replyFile), request.project)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  }

  async check(): Promise<string | undefined> {
    const stdout = await this.run(['--version'], process.cwd())
    return stdout.trim().split('\n')[0] || undefined
  }

  private async run(args: string[], cwd: string, stdin?: string): Promise<string> {
    await loadLoginShellPath()
    const { binary } = this.protocol
    return new Promise((resolve, reject) => {
      // `shell` is needed on Windows to resolve npm's `.cmd` shims; arguments are constants
      // or quoted paths.
      const child = spawn(binary, args, {
        cwd,
        env: childEnv(),
        shell: process.platform === 'win32',
      })
      let stdout = ''
      let stderr = ''
      child.stdout.on('data', (chunk) => (stdout += chunk))
      child.stderr.on('data', (chunk) => (stderr += chunk))
      child.on('error', (error) =>
        reject(new Error(`Could not start \`${binary}\`. Is it installed? (${error.message})`)),
      )
      child.on('close', (code) => {
        if (code === 0) resolve(stdout)
        else
          reject(new Error(stderr.trim() || stdout.trim() || `${binary} exited with code ${code}`))
      })
      child.stdin.end(stdin ?? '')
    })
  }
}

/** On Windows the arguments pass through cmd.exe, so a path with spaces needs quotes. */
function quoteArg(value: string): string {
  return process.platform === 'win32' ? `"${value}"` : value
}
