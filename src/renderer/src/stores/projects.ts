import { create } from 'zustand'
import type { Project } from '@shared/types'
import { api } from '../lib/api'

interface ProjectState {
  projects: Project[]
  loaded: boolean
  load(): Promise<void>
  create(path: string, name?: string): Promise<Project>
  remove(projectId: string): Promise<void>
}

export const useProjects = create<ProjectState>((set) => ({
  projects: [],
  loaded: false,

  load: async () => set({ projects: await api.projects.list(), loaded: true }),

  create: async (path, name = '') => {
    const project = await api.projects.create({ path, name })
    set((state) => ({ projects: upsert(state.projects, project) }))
    return project
  },

  remove: async (projectId) => {
    await api.projects.remove(projectId)
    set((state) => ({ projects: state.projects.filter((p) => p.id !== projectId) }))
  },
}))

function upsert(projects: Project[], project: Project): Project[] {
  const exists = projects.some((p) => p.id === project.id)
  return exists ? projects.map((p) => (p.id === project.id ? project : p)) : [...projects, project]
}

// The main process is the source of truth; mirror every change it broadcasts.
api.projects.onChanged((project) =>
  useProjects.setState((state) => ({ projects: upsert(state.projects, project) })),
)
