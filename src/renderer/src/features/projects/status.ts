import type { Goal, TaskStatus } from '@shared/types'

interface StatusStyle {
  label: string
  /** Text color for the label. */
  text: string
  dot: string
}

export const taskStatus: Record<TaskStatus, StatusStyle> = {
  pending: { label: 'Na fila', text: 'text-faint', dot: 'bg-faint' },
  running: { label: 'Executando', text: 'text-fg', dot: 'bg-fg' },
  done: { label: 'Concluída', text: 'text-muted', dot: 'bg-success' },
  failed: { label: 'Falhou', text: 'text-danger', dot: 'bg-danger' },
  blocked: { label: 'Bloqueada', text: 'text-warning', dot: 'bg-warning' },
  cancelled: { label: 'Cancelada', text: 'text-faint', dot: 'bg-faint' },
}

export const goalStatus: Record<Goal['status'], StatusStyle> = {
  planning: { label: 'Planejando', text: 'text-fg', dot: 'bg-fg' },
  running: { label: 'Em andamento', text: 'text-fg', dot: 'bg-fg' },
  done: { label: 'Concluído', text: 'text-muted', dot: 'bg-success' },
  failed: { label: 'Com falhas', text: 'text-danger', dot: 'bg-danger' },
}

export function formatDuration(start?: number, end?: number): string {
  if (!start) return ''
  const seconds = Math.max(0, Math.round(((end ?? Date.now()) - start) / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ${String(seconds % 60).padStart(2, '0')}s`
}
