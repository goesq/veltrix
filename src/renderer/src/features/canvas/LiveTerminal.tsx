import { useCallback } from 'react'
import { api } from '../../lib/api'
import { liveBus } from '../../lib/liveBus'
import { XTermView } from '../terminals/XTermView'

/** The interactive terminal of a live agent session. */
export function LiveTerminal({ projectId, agentId }: { projectId: string; agentId: string }) {
  const subscribe = useCallback(
    (write: (data: string) => void) => liveBus.attach(projectId, agentId, write),
    [projectId, agentId],
  )

  return (
    <XTermView
      renderer="dom"
      subscribe={subscribe}
      onInput={(data) => api.live.write(projectId, agentId, data)}
      onResize={(cols, rows) => api.live.resize(projectId, agentId, cols, rows)}
    />
  )
}
