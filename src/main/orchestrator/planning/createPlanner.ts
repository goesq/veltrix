import { plannerSpec, type PlannerEngine } from '@shared/ai'
import type { SettingsService } from '../../settings/SettingsService'
import { AnthropicApiPlanner } from './AnthropicApiPlanner'
import { CliPlanner } from './CliPlanner'
import { OpenAiCompatiblePlanner } from './OpenAiCompatiblePlanner'
import type { Planner } from './Planner'

/** Builds the planner for an engine from the current settings (model, endpoint, key). */
export function createPlanner(settings: SettingsService, engine: PlannerEngine): Planner {
  const { plannerModels, plannerBaseUrls } = settings.get()
  const spec = plannerSpec(engine)
  const model = plannerModels[engine]?.trim() || undefined

  if (spec.kind === 'cli') return new CliPlanner(engine, model)

  const apiKey = spec.key === 'none' ? undefined : settings.apiKey(engine)
  if (spec.key === 'required' && !apiKey) {
    throw new Error(`Add a ${spec.name} API key in Settings to plan with it.`)
  }
  if (!spec.baseUrl) return new AnthropicApiPlanner(apiKey!, model ?? spec.defaultModel)

  const baseUrl = (spec.kind === 'local' && plannerBaseUrls[engine]?.trim()) || spec.baseUrl
  return new OpenAiCompatiblePlanner({
    name: spec.name,
    baseUrl,
    apiKey,
    model: model ?? spec.defaultModel,
    jsonMode: spec.jsonMode ?? false,
  })
}
