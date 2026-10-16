import { createContext, useContext } from 'react'

/** Canvas-level actions that nodes trigger (React Flow only passes nodes their own props). */
export interface CanvasActions {
  removeFromCanvas(agentId: string): void
}

export const CanvasActionsContext = createContext<CanvasActions | null>(null)

export function useCanvasActions(): CanvasActions {
  const actions = useContext(CanvasActionsContext)
  if (!actions) throw new Error('useCanvasActions must be used inside the canvas.')
  return actions
}
