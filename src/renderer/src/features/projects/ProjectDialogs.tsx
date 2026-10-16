import { useEffect, useState } from 'react'
import {
  AGENT_COLORS,
  PROJECT_ICONS,
  type AgentColor,
  type Project,
  type ProjectIcon,
} from '@shared/types'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { Field, Input } from '../../components/ui/Field'
import { useT } from '../../i18n'
import { api } from '../../lib/api'
import { cn } from '../../lib/cn'
import { tagDot } from '../../lib/colors'
import { useProjects } from '../../stores/projects'
import { useTerminals } from '../../stores/terminals'
import { ProjectGlyph } from './ProjectGlyph'

interface ProjectDialogProps {
  project: Project
  open: boolean
  /** True while tasks are running: the folder can't change and the project can't be removed. */
  busy: boolean
  onClose(): void
}

/** Rename the project or point it at another folder. */
export function EditProjectDialog({ project, open, busy, onClose }: ProjectDialogProps) {
  const update = useProjects((s) => s.update)
  const t = useT()
  const { tabs, close, openForProject } = useTerminals()
  const [name, setName] = useState(project.name)
  const [path, setPath] = useState(project.path)
  const [icon, setIcon] = useState<ProjectIcon>(project.icon ?? 'folder')
  const [color, setColor] = useState<AgentColor | undefined>(project.color)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(project.name)
    setPath(project.path)
    setIcon(project.icon ?? 'folder')
    setColor(project.color)
    setError(null)
  }, [open, project.name, project.path, project.icon, project.color])

  const pickFolder = async (): Promise<void> => {
    const folder = await api.dialog.pickDirectory()
    if (folder) setPath(folder)
  }

  const save = async (): Promise<void> => {
    try {
      const updated = await update(project.id, { name, path, icon, color })
      // The project terminal lives in the old folder; reopen it in the new one.
      const terminal = tabs.find((tab) => tab.projectId === project.id)
      if (updated.path !== project.path && terminal) {
        await close(terminal.id)
        await openForProject(updated.id, updated.path, updated.name)
      }
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const changed =
    name.trim() !== project.name ||
    path !== project.path ||
    icon !== (project.icon ?? 'folder') ||
    color !== project.color

  return (
    <Dialog
      title={t.projectDialogs.editTitle}
      open={open}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button variant="primary" disabled={!changed} onClick={() => void save()}>
            {t.common.save}
          </Button>
        </>
      }
    >
      <Field label={t.projectDialogs.name}>
        <Input
          autoFocus
          value={name}
          placeholder={project.path.split(/[\\/]/).pop()}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && changed && void save()}
        />
      </Field>
      <Field
        label={t.projectDialogs.folder}
        hint={busy ? t.projectDialogs.folderBusy : t.projectDialogs.folderHint}
      >
        <div className="flex gap-2">
          <Input readOnly value={path} title={path} className="truncate font-mono text-xs" />
          <Button disabled={busy} onClick={() => void pickFolder()}>
            {t.common.choose}
          </Button>
        </div>
      </Field>
      <Field label={t.projectDialogs.icon}>
        <div className="grid grid-cols-8 gap-1">
          {PROJECT_ICONS.map((id) => (
            <button
              key={id}
              type="button"
              aria-label={id}
              aria-pressed={icon === id}
              onClick={() => setIcon(id)}
              className={cn(
                'flex h-9 items-center justify-center rounded-md transition-colors',
                icon === id ? 'bg-raised ring-1 ring-fg/60' : 'hover:bg-raised/60',
              )}
            >
              <ProjectGlyph icon={id} color={icon === id ? color : undefined} />
            </button>
          ))}
        </div>
      </Field>
      <Field label={t.projectDialogs.color}>
        <div className="flex gap-2">
          {AGENT_COLORS.map((option) => (
            <button
              key={option}
              type="button"
              aria-label={option}
              aria-pressed={color === option}
              onClick={() => setColor(option)}
              className={cn(
                'size-6 rounded-full ring-offset-2 ring-offset-panel transition',
                tagDot[option],
                color === option ? 'ring-2 ring-fg/70' : 'opacity-60 hover:opacity-100',
              )}
            />
          ))}
        </div>
      </Field>
      {error && <p className="text-xs text-danger">{error}</p>}
    </Dialog>
  )
}

/** Confirms removing the project from Veltrix; its folder and files stay untouched. */
export function RemoveProjectDialog({ project, open, busy, onClose }: ProjectDialogProps) {
  const removeProject = useProjects((s) => s.remove)
  const t = useT()
  const { tabs, close } = useTerminals()

  const remove = async (): Promise<void> => {
    const terminal = tabs.find((tab) => tab.projectId === project.id)
    if (terminal) await close(terminal.id)
    await removeProject(project.id)
    onClose()
  }

  return (
    <Dialog
      title={t.projectDialogs.removeTitle}
      open={open}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button variant="danger" disabled={busy} onClick={() => void remove()}>
            {t.common.remove}
          </Button>
        </>
      }
    >
      <p className="text-muted">{t.projectDialogs.removeQuestion(project.name)}</p>
      {busy && <p className="text-xs text-faint">{t.projectDialogs.removeBusy}</p>}
    </Dialog>
  )
}
