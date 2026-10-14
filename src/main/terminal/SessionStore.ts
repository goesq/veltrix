import type { TerminalSession } from '@shared/types'
import { JsonStore } from '../infra/JsonStore'

/** Remembers the open terminals (shell, folder, layout) to restore them on the next launch. */
export class SessionStore {
  private readonly store: JsonStore<{ session: TerminalSession | null }>

  constructor(filePath: string) {
    this.store = new JsonStore(filePath, { session: null })
  }

  load(): TerminalSession | null {
    return this.store.read().session
  }

  save(session: TerminalSession): void {
    this.store.write({ session })
  }
}
