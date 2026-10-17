import { canvasOf, notePath, notesOfAgent, noteTitle } from '@shared/canvas'
import type { Project } from '@shared/types'
import { pathForAgent } from '../projects/agentPaths'
import { ProjectWorkspace } from '../projects/ProjectWorkspace'
import type { NoteRef } from './liveBrief'

/**
 * The notes an agent can reach on the canvas, named and located as the agent sees them.
 * `only` narrows them to the given note ids.
 */
export async function linkedNotes(
  project: Project,
  agentId: string,
  only?: Set<string>,
): Promise<NoteRef[]> {
  const workspace = new ProjectWorkspace(project)
  const agent = project.agents.find((a) => a.id === agentId)
  const notes = notesOfAgent(canvasOf(project), agentId).filter(
    (note) => !only || only.has(note.id),
  )
  return Promise.all(
    notes.map(async (note) => ({
      title: noteTitle(note, await workspace.readNote(note.id)),
      path: agent ? pathForAgent(project, agent, notePath(note.id)) : notePath(note.id),
      locked: note.locked,
    })),
  )
}
