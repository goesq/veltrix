import { z } from 'zod/v4'
import { parsePlanText, type Plan, type Planner, type PlanRequest } from './Planner'
import { buildJsonPlannerPrompt, PLANNER_SYSTEM_PROMPT } from './planPrompt'

export interface OpenAiCompatibleOptions {
  /** Base URL up to the version segment, e.g. `https://api.openai.com/v1`. */
  baseUrl: string
  apiKey?: string
  model: string
  /** Ask for `response_format: { type: 'json_object' }`. */
  jsonMode: boolean
  /** Product name used in error messages. */
  name: string
}

const ChatResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        finish_reason: z.string().nullish(),
        message: z.object({ content: z.string().nullish(), refusal: z.string().nullish() }),
      }),
    )
    .min(1),
})

const ModelListSchema = z.object({ data: z.array(z.unknown()) })

const REQUEST_TIMEOUT_MS = 5 * 60_000
const CHECK_TIMEOUT_MS = 15_000

/**
 * Plans through any OpenAI-compatible `/chat/completions` endpoint: OpenAI itself, Gemini,
 * OpenRouter, DeepSeek, Mistral, xAI, Groq, Ollama, LM Studio, vLLM...
 */
export class OpenAiCompatiblePlanner implements Planner {
  constructor(private readonly options: OpenAiCompatibleOptions) {}

  async plan(request: PlanRequest): Promise<Plan> {
    const { model, jsonMode, name } = this.options
    if (!model.trim()) throw new Error(`Choose a model for ${name} in Settings.`)

    const body = await this.request(
      'chat/completions',
      {
        method: 'POST',
        body: JSON.stringify({
          model: model.trim(),
          messages: [
            { role: 'system', content: PLANNER_SYSTEM_PROMPT },
            { role: 'user', content: buildJsonPlannerPrompt(request) },
          ],
          ...(jsonMode && { response_format: { type: 'json_object' } }),
        }),
      },
      REQUEST_TIMEOUT_MS,
    )

    const [choice] = ChatResponseSchema.parse(body).choices
    if (choice.message.refusal) throw new Error(`${name} declined to plan this goal.`)
    if (choice.finish_reason === 'length') throw new Error('The plan was cut off (max tokens).')
    return parsePlanText(choice.message.content ?? '', request.project)
  }

  async check(): Promise<string | undefined> {
    const body = await this.request('models', { method: 'GET' }, CHECK_TIMEOUT_MS)
    const parsed = ModelListSchema.safeParse(body)
    return parsed.success ? `${parsed.data.data.length} models` : undefined
  }

  private async request(path: string, init: RequestInit, timeoutMs: number): Promise<unknown> {
    const { baseUrl, apiKey, name } = this.options
    const url = `${baseUrl.trim().replace(/\/+$/, '')}/${path}`
    let response: Response
    try {
      response = await fetch(url, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
        },
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      throw new Error(`Could not reach ${name} at ${baseUrl} (${reason}).`)
    }
    const text = await response.text()
    if (!response.ok) {
      throw new Error(`${name} answered ${response.status}: ${errorDetail(text)}`)
    }
    try {
      return JSON.parse(text)
    } catch {
      throw new Error(`${name} returned a response that is not JSON.`)
    }
  }
}

/** The `error.message` most providers send, or the start of the body. */
function errorDetail(body: string): string {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } | string }
    const message = typeof parsed.error === 'string' ? parsed.error : parsed.error?.message
    if (message) return message
  } catch {
    // Not JSON: fall through to the raw body.
  }
  return body.slice(0, 300) || 'no details'
}
