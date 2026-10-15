import type { Goal, TaskStatus } from '@shared/types'

/** Colors per status; the labels live in the i18n catalogs (taskStatus / goalStatus). */
interface StatusStyle {
  /** Text color for the label. */
  text: string
  dot: string
}

export const taskStatus: Record<TaskStatus, StatusStyle> = {
  pending: { text: 'text-faint', dot: 'bg-faint' },
  running: { text: 'text-fg', dot: 'bg-fg' },
  done: { text: 'text-muted', dot: 'bg-success' },
  failed: { text: 'text-danger', dot: 'bg-danger' },
  blocked: { text: 'text-warning', dot: 'bg-warning' },
  cancelled: { text: 'text-faint', dot: 'bg-faint' },
}

export const goalStatus: Record<Goal['status'], StatusStyle> = {
  planning: { text: 'text-fg', dot: 'bg-fg' },
  running: { text: 'text-fg', dot: 'bg-fg' },
  done: { text: 'text-muted', dot: 'bg-success' },
  failed: { text: 'text-danger', dot: 'bg-danger' },
}

export function formatDuration(start?: number, end?: number): string {
  if (!start) return ''
  const seconds = Math.max(0, Math.round(((end ?? Date.now()) - start) / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ${String(seconds % 60).padStart(2, '0')}s`
}
