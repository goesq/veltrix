import { api } from '../../lib/api'
import { useProjects } from '../../stores/projects'
import { useUi } from '../../stores/ui'

/** Picks a folder, registers it as a project and opens it. */
export async function addProject(): Promise<void> {
  const path = await api.dialog.pickDirectory()
  if (!path) return
  const project = await useProjects.getState().create(path)
  useUi.getState().openProject(project.id)
}
