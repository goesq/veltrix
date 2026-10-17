import { useState } from 'react'
import { GitBranch } from 'lucide-react'
import type { Agent } from '@shared/types'
import { SwitchField } from '../../components/ui/Switch'
import { useT } from '../../i18n'
import { api } from '../../lib/api'

interface AgentWorktreeProps {
  projectId: string
  agent: Agent
}

/**
 * Whether an agent works in its own git worktree. Takes effect at once (it creates or
 * removes the worktree), unlike the rest of the agent form, which is saved with the button.
 */
export function AgentWorktree({ projectId, agent }: AgentWorktreeProps) {
  const [worktree, setWorktree] = useState(agent.worktree)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const t = useT()

  const toggle = async (enabled: boolean): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      setWorktree((await api.projects.setAgentWorktree(projectId, agent.id, enabled)).worktree)
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
          : String(e),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-line p-3">
      <SwitchField
        label={t.agents.worktree}
        hint={t.agents.worktreeHint}
        checked={!!worktree}
        onChange={(enabled) => !busy && void toggle(enabled)}
      />
      {busy && <p className="text-xs text-faint">{t.agents.worktreeWorking}</p>}
      {worktree && !busy && (
        <p className="selectable flex flex-col gap-0.5 text-xs text-muted">
          <span className="flex items-center gap-1.5 text-fg">
            <GitBranch size={12} />
            {worktree.branch}
          </span>
          <span className="break-all font-mono text-[11px] text-faint">{worktree.path}</span>
        </p>
      )}
      {error && <p className="selectable text-xs text-danger">{error}</p>}
    </div>
  )
}
