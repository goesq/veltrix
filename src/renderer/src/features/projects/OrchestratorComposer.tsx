import { useState } from 'react'
import { ArrowUp } from 'lucide-react'
import type { Project } from '@shared/types'
import { Button } from '../../components/ui/Button'
import { useT } from '../../i18n'
import { api, isMac } from '../../lib/api'

interface OrchestratorComposerProps {
  project: Project
}

/**
 * Where the user describes a goal; the orchestrator plans it, adds the agents it needs and
 * distributes the tasks.
 */
export function OrchestratorComposer({ project }: OrchestratorComposerProps) {
  const [prompt, setPrompt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const t = useT()

  const submit = async (): Promise<void> => {
    if (!prompt.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    const text = prompt
    setPrompt('')
    try {
      await api.orchestrator.submit(project.id, text)
    } catch (e) {
      setPrompt(text)
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-lg border border-line bg-panel focus-within:border-line-strong">
      <textarea
        rows={3}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit()
        }}
        placeholder={t.orchestrator.placeholder}
        className="block w-full resize-none bg-transparent px-4 pb-2 pt-3 text-[13px] placeholder:text-faint focus:outline-none disabled:opacity-50"
      />
      <div className="flex items-center justify-between gap-3 px-3 pb-3">
        <span className="truncate pl-1 text-xs text-danger">{error}</span>
        <Button
          variant="primary"
          icon={<ArrowUp size={14} />}
          disabled={!prompt.trim() || submitting}
          onClick={() => void submit()}
          title={isMac ? '⌘ Enter' : 'Ctrl Enter'}
        >
          {submitting ? t.orchestrator.planning : t.orchestrator.send}
        </Button>
      </div>
    </div>
  )
}
