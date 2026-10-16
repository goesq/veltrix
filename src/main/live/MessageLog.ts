import type { CanvasMessage } from '@shared/types'
import { newId } from '../infra/ids'

/** Messages remembered per project, newest last. */
const LOG_SIZE = 200

/** The recent messages between live agents of each project, for the canvas. */
export class MessageLog {
  private readonly entries = new Map<string, CanvasMessage[]>()

  constructor(private readonly onRecord: (message: CanvasMessage) => void) {}

  list(projectId: string): CanvasMessage[] {
    return this.entries.get(projectId) ?? []
  }

  record(message: Omit<CanvasMessage, 'id' | 'at'>): void {
    const entry: CanvasMessage = { ...message, id: newId(), at: Date.now() }
    this.entries.set(message.projectId, [...this.list(message.projectId), entry].slice(-LOG_SIZE))
    this.onRecord(entry)
  }
}
