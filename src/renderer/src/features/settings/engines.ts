import { PLANNER_ENGINE_IDS, plannerSpec, type PlannerEngine, type PlannerSpec } from '@shared/ai'
import type { Messages } from '../../i18n'

export type EngineGroup = PlannerSpec['kind']

export const ENGINE_GROUPS: EngineGroup[] = ['cli', 'cloud', 'local']

export function enginesIn(group: EngineGroup): PlannerEngine[] {
  return PLANNER_ENGINE_IDS.filter((engine) => plannerSpec(engine).kind === group)
}

/** Product names stay the same in every language; only the generic endpoint is translated. */
export function engineName(engine: PlannerEngine, t: Messages): string {
  return engine === 'openai-compatible' ? t.settings.openAiCompatible : plannerSpec(engine).name
}
