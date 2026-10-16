import { basename } from 'node:path'
import {
  AGENT_COLORS,
  PROJECT_ICONS,
  type Agent,
  type AgentInput,
  type Project,
  type ProjectContext,
  type ProjectInput,
} from '@shared/types'
import { JsonStore } from '../infra/JsonStore'
import { newId } from '../infra/ids'

interface StoredProjects {
  projects: Project[]
}

export type ProjectListener = (project: Project) => void

/**
 * In-memory project state backed by a JSON file.
 * Every mutation goes through `update`, which persists and notifies listeners.
 */
export class ProjectRepository {
  private readonly store: JsonStore<StoredProjects>
  private readonly projects: Map<string, Project>
  private readonly listeners = new Set<ProjectListener>()

  constructor(filePath: string) {
    this.store = new JsonStore<StoredProjects>(filePath, { projects: [] })
    this.projects = new Map(this.store.read().projects.map((project) => [project.id, project]))
  }

  onChange(listener: ProjectListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  list(): Project[] {
    return [...this.projects.values()].sort((a, b) => a.createdAt - b.createdAt)
  }

  get(projectId: string): Project {
    const project = this.projects.get(projectId)
    if (!project) throw new Error(`Project ${projectId} not found.`)
    return project
  }

  create(input: ProjectInput): Project {
    const project: Project = {
      id: newId(),
      name: input.name.trim() || basename(input.path),
      path: input.path,
      // Each new project starts with the next color, so they tell apart before any edit.
      icon: validIcon(input.icon) ?? 'folder',
      color: validColor(input.color) ?? AGENT_COLORS[this.projects.size % AGENT_COLORS.length],
      agents: [],
      goals: [],
      tasks: [],
      createdAt: Date.now(),
    }
    this.projects.set(project.id, project)
    this.persist(project)
    return project
  }

  /** Renames the project or moves it to another folder; the folder can't change mid-run. */
  edit(projectId: string, input: ProjectInput): Project {
    return this.update(projectId, (project) => {
      if (input.path !== project.path && project.tasks.some((task) => task.status === 'running')) {
        throw new Error('Wait for the running tasks to finish before changing the folder.')
      }
      project.path = input.path
      project.name = input.name.trim() || basename(input.path)
      project.icon = validIcon(input.icon) ?? project.icon
      project.color = validColor(input.color) ?? project.color
    })
  }

  setContext(projectId: string, context: ProjectContext): Project {
    if (context.scope === 'shared' && context.source === 'file' && !context.file.trim()) {
      throw new Error('Choose the file agents should read.')
    }
    return this.update(projectId, (project) => {
      project.context = context
    })
  }

  remove(projectId: string): void {
    this.projects.delete(projectId)
    this.store.write({ projects: this.list() })
  }

  saveAgent(projectId: string, input: AgentInput & { id?: string }): Agent {
    const agent: Agent = { ...input, id: input.id ?? newId() }
    this.update(projectId, (project) => {
      const index = project.agents.findIndex((existing) => existing.id === agent.id)
      if (index >= 0) project.agents[index] = agent
      else project.agents.push(agent)
    })
    return agent
  }

  removeAgent(projectId: string, agentId: string): void {
    this.update(projectId, (project) => {
      project.agents = project.agents.filter((agent) => agent.id !== agentId)
    })
  }

  /** Applies `mutate` to the project, persists it and notifies listeners. */
  update(projectId: string, mutate: (project: Project) => void): Project {
    const project = this.get(projectId)
    mutate(project)
    this.persist(project)
    return project
  }

  private persist(project: Project): void {
    this.store.write({ projects: this.list() })
    const snapshot = structuredClone(project)
    for (const listener of this.listeners) listener(snapshot)
  }
}

function validIcon(icon: unknown): Project['icon'] {
  return PROJECT_ICONS.find((known) => known === icon)
}

function validColor(color: unknown): Project['color'] {
  return AGENT_COLORS.find((known) => known === color)
}
