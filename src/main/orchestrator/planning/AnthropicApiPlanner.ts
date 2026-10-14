import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { PlanSchema, validatePlan, type Plan, type Planner, type PlanRequest } from './Planner'
import { buildPlannerPrompt, PLANNER_SYSTEM_PROMPT } from './planPrompt'

/** Plans through the Anthropic Messages API with schema-constrained output. */
export class AnthropicApiPlanner implements Planner {
  private readonly client: Anthropic

  constructor(
    apiKey: string,
    private readonly model: string,
  ) {
    this.client = new Anthropic({ apiKey })
  }

  async plan(request: PlanRequest): Promise<Plan> {
    const response = await this.client.beta.messages.parse({
      model: this.model,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high', format: betaZodOutputFormat(PlanSchema) },
      // On a policy decline, let the API retry on a fallback model within the same call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: PLANNER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildPlannerPrompt(request) }],
    })

    if (response.stop_reason === 'refusal') throw new Error('The model declined to plan this goal.')
    if (response.stop_reason === 'max_tokens') throw new Error('The plan was cut off (max tokens).')
    if (!response.parsed_output) throw new Error('The planner returned an invalid plan.')
    return validatePlan(response.parsed_output, request.project)
  }
}
