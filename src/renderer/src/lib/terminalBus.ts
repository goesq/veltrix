import { api } from './api'

type DataHandler = (data: string) => void

/** Output kept per session so a view that (re)mounts can replay it. */
const HISTORY_LIMIT = 256 * 1024

/**
 * Routes terminal output from the single IPC stream to the view of each session and keeps
 * a bounded history, so remounting a view (layout change, dev StrictMode) loses nothing.
 */
class TerminalBus {
  private readonly handlers = new Map<string, DataHandler>()
  private readonly history = new Map<string, string>()

  constructor() {
    api.terminal.onData((id, data) => {
      this.history.set(id, ((this.history.get(id) ?? '') + data).slice(-HISTORY_LIMIT))
      this.handlers.get(id)?.(data)
    })
  }

  attach(id: string, handler: DataHandler): () => void {
    this.handlers.set(id, handler)
    const history = this.history.get(id)
    if (history) handler(history)
    return () => {
      if (this.handlers.get(id) === handler) this.handlers.delete(id)
    }
  }

  forget(id: string): void {
    this.handlers.delete(id)
    this.history.delete(id)
  }
}

export const terminalBus = new TerminalBus()
