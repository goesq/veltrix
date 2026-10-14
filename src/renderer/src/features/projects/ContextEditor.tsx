import { useEffect, useState } from 'react'
import { PROJECT_WORKSPACE_DIR } from '@shared/constants'
import type { Project } from '@shared/types'
import { Button } from '../../components/ui/Button'
import { api } from '../../lib/api'

interface ContextEditorProps {
  project: Project
}

/** Edits the shared CONTEXT.md that every agent reads before working on a task. */
export function ContextEditor({ project }: ContextEditorProps) {
  const [content, setContent] = useState<string | null>(null)
  const [saved, setSaved] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setContent(null)
    void api.projects.readContext(project.id).then((text) => {
      setContent(text)
      setSaved(text)
    })
  }, [project.id])

  const dirty = content !== null && content !== saved

  const save = async (): Promise<void> => {
    if (content === null) return
    try {
      await api.projects.writeContext(project.id, content)
      setSaved(content)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <p className="text-muted">
        Contexto compartilhado entre todos os agentes, salvo em{' '}
        <code className="font-mono text-xs text-fg">{PROJECT_WORKSPACE_DIR}/CONTEXT.md</code>. Os
        agentes também anotam aqui o que aprendem.
      </p>
      <textarea
        value={content ?? ''}
        disabled={content === null}
        spellCheck={false}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            void save()
          }
        }}
        className="min-h-0 flex-1 resize-none rounded-lg border border-line bg-surface p-4 font-mono text-xs leading-relaxed focus:border-line-strong focus:outline-none"
      />
      <div className="flex items-center justify-end gap-3">
        {error && <span className="text-xs text-danger">{error}</span>}
        <span className="text-xs text-faint">{dirty ? 'Alterações não salvas' : 'Salvo'}</span>
        <Button variant="primary" disabled={!dirty} onClick={() => void save()}>
          Salvar
        </Button>
      </div>
    </div>
  )
}
