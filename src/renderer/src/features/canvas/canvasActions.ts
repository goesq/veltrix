import { createContext, useContext } from 'react'
import type { CanvasNoteNode, CanvasTextNode } from '@shared/types'

/** Canvas-level actions that nodes trigger (React Flow only passes nodes their own props). */
export interface CanvasActions {
  /** Takes nodes off the canvas: agents stay in the project, notes are deleted. */
  remove(ids: string[]): void
  updateNote(id: string, patch: Partial<CanvasNoteNode>): void
  updateText(id: string, patch: Partial<CanvasTextNode>): void
  /** Opens a node as a large panel over the canvas (or puts it back, with null). */
  lift(id: string | null): void
  /** Node currently shown as a panel, if any. */
  lifted: string | null
  /** Node just created, which opens ready for typing. */
  justCreated: string | null
}

export const CanvasActionsContext = createContext<CanvasActions | null>(null)

export function useCanvasActions(): CanvasActions {
  const actions = useContext(CanvasActionsContext)
  if (!actions) throw new Error('useCanvasActions must be used inside the canvas.')
  return actions
}
