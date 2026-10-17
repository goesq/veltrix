import type { NoteChange } from '@shared/types'
import { api } from './api'

type ChangeHandler = (content: string) => void

/** Routes note changes from the single IPC stream to the views of each note. */
class NoteBus {
  private readonly handlers = new Map<string, Set<ChangeHandler>>()

  constructor() {
    api.notes.onChanged(({ projectId, noteId, content }: NoteChange) => {
      this.handlers.get(noteKey(projectId, noteId))?.forEach((handler) => handler(content))
    })
  }

  attach(projectId: string, noteId: string, handler: ChangeHandler): () => void {
    const key = noteKey(projectId, noteId)
    const handlers = this.handlers.get(key) ?? new Set()
    handlers.add(handler)
    this.handlers.set(key, handlers)
    return () => {
      handlers.delete(handler)
      if (handlers.size === 0) this.handlers.delete(key)
    }
  }
}

const noteKey = (projectId: string, noteId: string): string => `${projectId}:${noteId}`

export const noteBus = new NoteBus()
