import { useEffect, useState, type ReactNode } from 'react'
import { FileText } from 'lucide-react'
import {
  DEFAULT_PROJECT_CONTEXT,
  type Agent,
  type Project,
  type ProjectContext,
} from '@shared/types'
import { Button } from '../../components/ui/Button'
import { StatusDot } from '../../components/ui/StatusDot'
import { useT } from '../../i18n'
import { api } from '../../lib/api'
import { cn } from '../../lib/cn'
import { tagDot } from '../../lib/colors'

interface ContextEditorProps {
  project: Project
}

/**
 * Where the agents' context comes from (one file for the project or one per agent, and
 * which file), and an editor for it.
 */
export function ContextEditor({ project }: ContextEditorProps) {
  const context = project.context ?? DEFAULT_PROJECT_CONTEXT
  const [agentId, setAgentId] = useState<string | undefined>(project.agents[0]?.id)
  const [error, setError] = useState<string | null>(null)
  const t = useT()

  const agent = project.agents.find((a) => a.id === agentId) ?? project.agents[0]
  const perAgent = context.scope === 'perAgent'

  const run = async (action: () => Promise<unknown>): Promise<void> => {
    try {
      await action()
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const setContext = (next: ProjectContext): Promise<void> =>
    run(() => api.projects.setContext(project.id, next))

  /** Opens the file picker; resolves with nothing when the user cancels. */
  const pickFile = async (): Promise<string | null> => api.projects.pickContextFile(project.id)

  const chooseSharedFile = async (): Promise<void> => {
    const file = await pickFile()
    if (file) await setContext({ scope: 'shared', source: 'file', file })
  }

  const setAgentFile = (target: Agent, contextFile: string | undefined): Promise<void> =>
    run(() => api.projects.saveAgent(project.id, { ...target, contextFile }))

  const sharedFile = context.scope === 'shared' && context.source === 'file' ? context.file : null

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted">{t.context.scope}</span>
        <div className="grid grid-cols-2 gap-2">
          <Choice
            active={!perAgent}
            title={t.context.scopeShared}
            hint={t.context.scopeSharedHint}
            onSelect={() => perAgent && void setContext({ scope: 'shared', source: 'veltrix' })}
          />
          <Choice
            active={perAgent}
            title={t.context.scopePerAgent}
            hint={t.context.scopePerAgentHint}
            onSelect={() => !perAgent && void setContext({ scope: 'perAgent' })}
          />
        </div>
      </div>

      {context.scope === 'shared' && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">{t.context.source}</span>
          <div className="grid grid-cols-3 gap-2">
            <Choice
              active={context.source === 'veltrix'}
              title={t.context.sourceVeltrix}
              hint=".veltrix/CONTEXT.md"
              mono
              onSelect={() => void setContext({ scope: 'shared', source: 'veltrix' })}
            />
            <Choice
              active={context.source === 'claudeMd'}
              title={t.context.sourceClaudeMd}
              hint="CLAUDE.md"
              mono
              onSelect={() => void setContext({ scope: 'shared', source: 'claudeMd' })}
            />
            <Choice
              active={sharedFile !== null}
              title={t.context.sourceFile}
              hint={sharedFile ?? t.context.chooseFile}
              mono={sharedFile !== null}
              onSelect={() => (sharedFile === null ? void chooseSharedFile() : undefined)}
              action={
                sharedFile !== null && (
                  <ChangeFileLink
                    label={t.context.changeFile}
                    onClick={() => void chooseSharedFile()}
                  />
                )
              }
            />
          </div>
        </div>
      )}

      {perAgent && !agent && (
        <p className="rounded-lg border border-dashed border-line p-4 text-muted">
          {t.context.noAgents}
        </p>
      )}

      {perAgent && agent && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {project.agents.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAgentId(a.id)}
                className={cn(
                  'flex h-7 items-center gap-2 rounded-full border px-3 text-xs transition-colors',
                  a.id === agent.id
                    ? 'border-line-strong bg-raised text-fg'
                    : 'border-line text-muted hover:border-line-strong hover:text-fg',
                )}
              >
                <StatusDot className={tagDot[a.color]} />
                {a.name}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">
              {t.context.agentFile(agent.name)}
            </span>
            <div className="grid grid-cols-2 gap-2">
              <Choice
                active={!agent.contextFile}
                title={t.context.sourceVeltrix}
                hint={`.veltrix/agents/${agent.id}.md`}
                mono
                onSelect={() => agent.contextFile && void setAgentFile(agent, undefined)}
              />
              <Choice
                active={Boolean(agent.contextFile)}
                title={t.context.sourceFile}
                hint={agent.contextFile ?? t.context.chooseFile}
                mono={Boolean(agent.contextFile)}
                onSelect={async () => {
                  if (agent.contextFile) return
                  const file = await pickFile()
                  if (file) await setAgentFile(agent, file)
                }}
                action={
                  agent.contextFile && (
                    <ChangeFileLink
                      label={t.context.changeFile}
                      onClick={async () => {
                        const file = await pickFile()
                        if (file) await setAgentFile(agent, file)
                      }}
                    />
                  )
                }
              />
            </div>
          </div>
        </>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}

      {(!perAgent || agent) && (
        <ContextDocumentEditor
          // Reload whenever the file being edited changes.
          key={contextKey(context, perAgent ? agent : undefined)}
          projectId={project.id}
          agentId={perAgent ? agent?.id : undefined}
        />
      )}
    </div>
  )
}

function contextKey(context: ProjectContext, agent: Agent | undefined): string {
  if (agent) return `agent:${agent.id}:${agent.contextFile ?? ''}`
  if (context.scope === 'shared' && context.source === 'file') return `file:${context.file}`
  return context.scope === 'shared' ? context.source : context.scope
}

/** Edits one context file; Ctrl/⌘+S saves. */
function ContextDocumentEditor({ projectId, agentId }: { projectId: string; agentId?: string }) {
  const [document, setDocument] = useState<{ path: string; exists: boolean } | null>(null)
  const [content, setContent] = useState<string | null>(null)
  const [saved, setSaved] = useState('')
  const [error, setError] = useState<string | null>(null)
  const t = useT()

  useEffect(() => {
    void api.projects
      .readContext(projectId, agentId)
      .then((doc) => {
        setDocument({ path: doc.path, exists: doc.exists })
        setContent(doc.content)
        setSaved(doc.content)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [projectId, agentId])

  const dirty = content !== null && content !== saved

  const save = async (): Promise<void> => {
    if (content === null) return
    try {
      await api.projects.writeContext(projectId, content, agentId)
      setSaved(content)
      setDocument((d) => d && { ...d, exists: true })
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="flex min-h-[320px] flex-1 flex-col gap-2">
      <div className="flex items-center gap-2 text-xs">
        <FileText size={13} className="shrink-0 text-faint" />
        <code className="selectable truncate font-mono text-fg" title={document?.path}>
          {document?.path ?? '…'}
        </code>
        <span className="ml-auto shrink-0 text-faint">
          {document && !document.exists ? t.context.missingFile : t.context.notesHint}
        </span>
      </div>
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
        <span className="text-xs text-faint">{dirty ? t.context.unsaved : t.context.saved}</span>
        <Button variant="primary" disabled={!dirty} onClick={() => void save()}>
          {t.common.save}
        </Button>
      </div>
    </div>
  )
}

interface ChoiceProps {
  active: boolean
  title: string
  hint: string
  /** Shows the hint as a path. */
  mono?: boolean
  onSelect(): void
  /** Extra control shown under the hint (e.g. change the picked file). */
  action?: ReactNode
}

function Choice({ active, title, hint, mono, onSelect, action }: ChoiceProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={active}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      className={cn(
        'flex min-w-0 cursor-pointer flex-col gap-1 rounded-lg border p-3 text-left transition-colors',
        active ? 'border-fg/60 bg-raised' : 'border-line bg-panel hover:border-line-strong',
      )}
    >
      <span className="font-medium">{title}</span>
      <span className={cn('truncate text-xs text-faint', mono && 'font-mono')} title={hint}>
        {hint}
      </span>
      {action}
    </div>
  )
}

function ChangeFileLink({ label, onClick }: { label: string; onClick(): void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="self-start text-xs text-muted underline-offset-2 hover:text-fg hover:underline"
    >
      {label}
    </button>
  )
}
