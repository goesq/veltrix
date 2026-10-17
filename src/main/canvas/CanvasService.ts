import { canvasOf, notesOfAgent } from '@shared/canvas'
import type { Project, ProjectCanvas } from '@shared/types'
import { formatNoteLink } from '../live/liveBrief'
import { linkedNotes } from '../live/linkedNotes'
import type { MessageDelivery } from '../live/MessageRouter'
import type { ProjectRepository } from '../projects/ProjectRepository'
import { ProjectWorkspace } from '../projects/ProjectWorkspace'

/**
 * Saves a project's canvas and keeps what it implies in step: the files of deleted notes go
 * to the trash (and come back on undo), locked notes become read-only on disk, and running
 * agents hear about notes the user just linked them to.
 */
export class CanvasService {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly delivery: MessageDelivery,
  ) {}

  async save(projectId: string, next: ProjectCanvas): Promise<Project> {
    const before = canvasOf(this.projects.get(projectId))
    const project = this.projects.saveCanvas(projectId, next)
    const after = canvasOf(project)
    const workspace = new ProjectWorkspace(project)

    const kept = new Set(after.notes.map((note) => note.id))
    const wasLocked = new Map(before.notes.map((note) => [note.id, !!note.locked]))
    const had = new Set(before.notes.map((note) => note.id))
    // A note coming back (undo) gets its file back from the trash first, so locking applies.
    await Promise.all(
      after.notes.filter((note) => !had.has(note.id)).map((note) => workspace.restoreNote(note.id)),
    )
    await Promise.all([
      ...before.notes
        .filter((note) => !kept.has(note.id))
        .map((note) => workspace.trashNote(note.id)),
      ...after.notes
        .filter((note) => !!note.locked !== (wasLocked.get(note.id) ?? false))
        .map((note) => workspace.setNoteLocked(note.id, !!note.locked)),
    ])
    await this.announceNewLinks(project, before)
    return project
  }

  async readNote(projectId: string, noteId: string): Promise<string> {
    return new ProjectWorkspace(this.projects.get(projectId)).readNote(noteId)
  }

  async writeNote(projectId: string, noteId: string, content: string): Promise<void> {
    const project = this.projects.get(projectId)
    if (canvasOf(project).notes.find((note) => note.id === noteId)?.locked) {
      throw new Error('This note is locked. Unlock it to edit.')
    }
    await new ProjectWorkspace(project).writeNote(noteId, content)
  }

  /** Tells each running agent about the notes it can reach now and couldn't before. */
  private async announceNewLinks(project: Project, before: ProjectCanvas): Promise<void> {
    const after = canvasOf(project)
    for (const { agentId } of after.nodes) {
      if (!this.delivery.isRunning(project.id, agentId)) continue
      const known = new Set(notesOfAgent(before, agentId).map((note) => note.id))
      const fresh = notesOfAgent(after, agentId).filter((note) => !known.has(note.id))
      if (fresh.length === 0) continue
      const refs = await linkedNotes(project, agentId, new Set(fresh.map((note) => note.id)))
      this.delivery.paste(project.id, agentId, formatNoteLink(refs))
    }
  }
}
