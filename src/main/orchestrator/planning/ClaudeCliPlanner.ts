import { spawn } from 'node:child_process'
import { z } from 'zod/v4'
import { childEnv } from '../../infra/environment'
import { PlanSchema, validatePlan, type Plan, type Planner, type PlanRequest } from './Planner'
import { buildPlannerPrompt, PLANNER_SYSTEM_PROMPT } from './planPrompt'

const CliResultSchema = z.object({
  is_error: z.boolean().optional(),
  result: z.string().optional(),
})

/**
 * Plans through the locally installed Claude Code CLI (`claude -p`), reusing the user's
 * existing login, so no API key is required. The prompt goes through stdin to avoid
 * shell-quoting issues across platforms.
 */
export class ClaudeCliPlanner implements Planner {
  async plan(request: PlanRequest): Promise<Plan> {
    const prompt = `${PLANNER_SYSTEM_PROMPT}

${buildPlannerPrompt(request)}

Respond with only a JSON object matching this JSON Schema, with no prose and no code fences:
${JSON.stringify(z.toJSONSchema(PlanSchema))}`

    const stdout = await runClaude(['-p', '--output-format', 'json'], prompt, request.project.path)
    const cli = CliResultSchema.parse(JSON.parse(stdout))
    if (cli.is_error) throw new Error(cli.result || 'Claude CLI reported an error.')

    const plan = PlanSchema.parse(JSON.parse(extractJson(cli.result ?? '')))
    return validatePlan(plan, request.project)
  }
}

function runClaude(args: string[], stdin: string, cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // `shell` is needed on Windows to resolve the `claude.cmd` shim; the arguments are constants.
    const child = spawn('claude', args, {
      cwd,
      env: childEnv(),
      shell: process.platform === 'win32',
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => (stdout += chunk))
    child.stderr.on('data', (chunk) => (stderr += chunk))
    child.on('error', (error) =>
      reject(new Error(`Could not start the Claude CLI. Is it installed? (${error.message})`)),
    )
    child.on('close', (code) => {
      if (code === 0) resolve(stdout)
      else reject(new Error(stderr.trim() || stdout.trim() || `claude exited with code ${code}`))
    })
    child.stdin.end(stdin)
  })
}

/** Pulls the outermost JSON object out of a reply that may still contain fences or prose. */
function extractJson(text: string): string {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('The planner did not return JSON.')
  return text.slice(start, end + 1)
}
