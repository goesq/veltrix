import { safeStorage } from 'electron'
import { acceptsApiKey, isPlannerEngine, type PlannerEngine } from '@shared/ai'
import { DEFAULT_LOCALE } from '@shared/i18n'
import type { Settings, SettingsPatch } from '@shared/types'
import { JsonStore } from '../infra/JsonStore'

interface StoredSettings extends Omit<Settings, 'apiKeys'> {
  /** API keys by engine, encrypted with the OS keychain via Electron's safeStorage. */
  encryptedApiKeys: Partial<Record<PlannerEngine, string>>
}

/** Fields written by earlier versions, which had a single Anthropic key and model. */
interface LegacySettings {
  encryptedApiKey?: string
  plannerModel?: string
}

const DEFAULTS: StoredSettings = {
  plannerEngine: 'claude-cli',
  plannerModels: {},
  plannerBaseUrls: {},
  encryptedApiKeys: {},
  terminalFontSize: 13,
  defaultShellProfileId: null,
  defaultTerminalCwd: null,
  terminalPrompt: true,
  terminalBanner: true,
  language: DEFAULT_LOCALE,
  keybindings: {},
}

export class SettingsService {
  private readonly store: JsonStore<StoredSettings>
  private state: StoredSettings

  constructor(filePath: string) {
    this.store = new JsonStore(filePath, DEFAULTS)
    this.state = migrate(this.store.read())
  }

  get(): Settings {
    const { encryptedApiKeys, ...rest } = this.state
    const apiKeys = (Object.keys(encryptedApiKeys) as PlannerEngine[]).filter(
      (engine) => encryptedApiKeys[engine],
    )
    return { ...rest, apiKeys }
  }

  update(patch: SettingsPatch): Settings {
    if (patch.plannerEngine !== undefined && !isPlannerEngine(patch.plannerEngine)) {
      throw new Error(`Unknown planner "${String(patch.plannerEngine)}".`)
    }
    this.state = { ...this.state, ...patch }
    this.store.write(this.state)
    return this.get()
  }

  setApiKey(engine: PlannerEngine, key: string | null): Settings {
    if (!isPlannerEngine(engine) || !acceptsApiKey(engine)) {
      throw new Error(`"${String(engine)}" does not use an API key.`)
    }
    const keys = { ...this.state.encryptedApiKeys }
    const trimmed = key?.trim()
    if (!trimmed) {
      delete keys[engine]
    } else {
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('Secure storage is not available on this system.')
      }
      keys[engine] = safeStorage.encryptString(trimmed).toString('base64')
    }
    this.state = { ...this.state, encryptedApiKeys: keys }
    this.store.write(this.state)
    return this.get()
  }

  /** Decrypted API key of an engine. Only for use inside the main process. */
  apiKey(engine: PlannerEngine): string | undefined {
    const encrypted = this.state.encryptedApiKeys[engine]
    if (!encrypted) return undefined
    return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
  }
}

/** Brings settings saved by an earlier version to the current shape. */
function migrate(stored: StoredSettings & LegacySettings): StoredSettings {
  const { encryptedApiKey, plannerModel, ...state } = stored
  if (encryptedApiKey && !state.encryptedApiKeys['anthropic-api']) {
    state.encryptedApiKeys = { ...state.encryptedApiKeys, 'anthropic-api': encryptedApiKey }
  }
  if (plannerModel && !state.plannerModels['anthropic-api']) {
    state.plannerModels = { ...state.plannerModels, 'anthropic-api': plannerModel }
  }
  if (!isPlannerEngine(state.plannerEngine)) state.plannerEngine = DEFAULTS.plannerEngine
  return state
}
