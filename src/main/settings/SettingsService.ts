import { safeStorage } from 'electron'
import type { Settings, SettingsPatch } from '@shared/types'
import { JsonStore } from '../infra/JsonStore'

interface StoredSettings extends Omit<Settings, 'hasApiKey'> {
  /** Anthropic API key, encrypted with the OS keychain via Electron's safeStorage. */
  encryptedApiKey?: string
}

const DEFAULTS: StoredSettings = {
  plannerEngine: 'claude-cli',
  plannerModel: 'claude-opus-5-5',
  terminalFontSize: 13,
  defaultShellProfileId: null,
  keybindings: {},
}

export class SettingsService {
  private readonly store: JsonStore<StoredSettings>
  private state: StoredSettings

  constructor(filePath: string) {
    this.store = new JsonStore(filePath, DEFAULTS)
    this.state = this.store.read()
  }

  get(): Settings {
    const { encryptedApiKey, ...rest } = this.state
    return { ...rest, hasApiKey: Boolean(encryptedApiKey) }
  }

  update(patch: SettingsPatch): Settings {
    this.state = { ...this.state, ...patch }
    this.store.write(this.state)
    return this.get()
  }

  setApiKey(key: string | null): Settings {
    const trimmed = key?.trim()
    if (!trimmed) {
      delete this.state.encryptedApiKey
    } else {
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('Secure storage is not available on this system.')
      }
      this.state.encryptedApiKey = safeStorage.encryptString(trimmed).toString('base64')
    }
    this.store.write(this.state)
    return this.get()
  }

  /** Decrypted API key. Only for use inside the main process. */
  apiKey(): string | undefined {
    const encrypted = this.state.encryptedApiKey
    if (!encrypted) return undefined
    return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
  }
}
