import { watch, type FSWatcher } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { isNoteId } from '@shared/canvas'
import type { NoteChange } from '@shared/types'
import type { ProjectRepository } from '../projects/ProjectRepository'
import { ProjectWorkspace } from '../projects/ProjectWorkspace'

/** Editors and agents often write a file in several steps; report it once they settle. */
const SETTLE_MS = 120

interface ProjectWatch {
  watcher: FSWatcher
  timers: Map<string, ReturnType<typeof setTimeout>>
}

/**
 * Watches the notes folder of the projects whose canvas is open, so a note an agent edits
 * updates on screen as it happens.
 */
export class NoteWatcher {
  private readonly watches = new Map<string, ProjectWatch>()

  constructor(
    private readonly projects: ProjectRepository,
    private readonly onChange: (change: NoteChange) => void,
  ) {}

  async watch(projectId: string): Promise<void> {
    if (this.watches.has(projectId)) return
    const dir = new ProjectWorkspace(this.projects.get(projectId)).notesDir
    await mkdir(dir, { recursive: true })
    if (this.watches.has(projectId)) return // Another call won the race.

    const timers = new Map<string, ReturnType<typeof setTimeout>>()
    const watcher = watch(dir, (_event, filename) => {
      const noteId = filename?.toString().match(/^(.+)\.md$/)?.[1]
      if (!noteId || !isNoteId(noteId)) return
      clearTimeout(timers.get(noteId))
      timers.set(
        noteId,
        setTimeout(() => {
          timers.delete(noteId)
          void this.report(projectId, noteId)
        }, SETTLE_MS),
      )
    })
    watcher.on('error', () => this.unwatch(projectId))
    this.watches.set(projectId, { watcher, timers })
  }

  unwatch(projectId: string): void {
    const current = this.watches.get(projectId)
    if (!current) return
    this.watches.delete(projectId)
    current.timers.forEach(clearTimeout)
    current.watcher.close()
  }

  unwatchAll(): void {
    for (const projectId of [...this.watches.keys()]) this.unwatch(projectId)
  }

  private async report(projectId: string, noteId: string): Promise<void> {
    const project = this.projects.find(projectId)
    if (!project) return
    const content = await new ProjectWorkspace(project).readNote(noteId)
    this.onChange({ projectId, noteId, content })
  }
}
