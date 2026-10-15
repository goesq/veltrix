import { useEffect, useState } from 'react'
import type { Project } from '@shared/types'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { Field, Input } from '../../components/ui/Field'
import { useT } from '../../i18n'
import { api } from '../../lib/api'
import { useProjects } from '../../stores/projects'
import { useTerminals } from '../../stores/terminals'

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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(project.name)
    setPath(project.path)
    setError(null)
  }, [open, project.name, project.path])

  const pickFolder = async (): Promise<void> => {
    const folder = await api.dialog.pickDirectory()
    if (folder) setPath(folder)
  }

  const save = async (): Promise<void> => {
    try {
      const updated = await update(project.id, { name, path })
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

  const changed = name.trim() !== project.name || path !== project.path

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
