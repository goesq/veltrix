import { useEffect, useRef, useState } from 'react'
import { Handle, NodeResizer, Position, type NodeProps } from '@xyflow/react'
import { Eye, Lock, Maximize2, Minimize2, MoreHorizontal, Pencil, Plus } from 'lucide-react'
import { checklistProgress, noteTitle } from '@shared/canvas'
import { NOTE_COLORS, type CanvasNoteNode, type NoteColor } from '@shared/types'
import { IconButton } from '../../components/ui/Button'
import { Menu } from '../../components/ui/Menu'
import { useT } from '../../i18n'
import { cn } from '../../lib/cn'
import { useCanvasActions } from './canvasActions'
import { MIN_SIZE, type NoteFlowNode } from './canvasModel'
import { LiftedPlaceholder } from './LiftedPlaceholder'
import { Markdown, toggleTask } from './Markdown'
import { useNote } from './useNote'

/** Swatch shown for each note color (plain is the panel's own). */
const swatch: Record<NoteColor, string> = {
  plain: 'bg-muted',
  yellow: 'bg-tag-yellow',
  green: 'bg-tag-green',
  blue: 'bg-tag-blue',
  pink: 'bg-tag-pink',
  purple: 'bg-tag-purple',
}

/** A markdown note on the canvas; agents linked to it read and edit the same file. */
export function NoteNode({ id, data, selected }: NodeProps<NoteFlowNode>) {
  const { lifted } = useCanvasActions()
  return (
    <>
      <NodeResizer
        isVisible
        minWidth={MIN_SIZE.note.width}
        minHeight={MIN_SIZE.note.height}
        lineClassName="canvas-resize-line"
        handleClassName="canvas-resize-handle"
      />
      <Handle type="target" position={Position.Left} className="canvas-handle" />
      <Handle type="source" position={Position.Right} className="canvas-handle" />
      {lifted === id ? (
        <LiftedPlaceholder selected={selected} />
      ) : (
        <NoteCard projectId={data.projectId} note={data.note} selected={selected} />
      )}
    </>
  )
}

interface NoteCardProps {
  projectId: string
  note: CanvasNoteNode
  selected?: boolean
  /** Shown as a large panel over the canvas. */
  panel?: boolean
}

/** Header and content of a note, on the canvas or lifted into a panel. */
export function NoteCard({ projectId, note, selected, panel }: NoteCardProps) {
  const { content, edit, flush, error } = useNote(projectId, note.id)
  const { remove, updateNote, lift, justCreated } = useCanvasActions()
  const [editing, setEditing] = useState(justCreated === note.id)
  const [renaming, setRenaming] = useState(false)
  const t = useT()

  const text = content ?? ''
  const title = noteTitle(note, text)
  const progress = checklistProgress(text)
  const canEdit = !note.locked && content !== null

  const nextColor = (): NoteColor =>
    NOTE_COLORS[(NOTE_COLORS.indexOf(note.color) + 1) % NOTE_COLORS.length]

  return (
    <div
      className={cn(
        'canvas-note flex h-full w-full flex-col overflow-hidden rounded-lg border shadow-lg',
        `note-${note.color}`,
        selected && 'canvas-node-selected',
      )}
    >
      <header
        className="canvas-node-handle flex h-9 shrink-0 cursor-grab items-center gap-2 px-2.5 active:cursor-grabbing"
        onDoubleClick={() => lift(panel ? null : note.id)}
        title={panel ? undefined : t.canvas.liftHint}
      >
        <button
          type="button"
          title={t.canvas.noteColor}
          onClick={() => updateNote(note.id, { color: nextColor() })}
          onDoubleClick={(e) => e.stopPropagation()}
          className={cn('nodrag size-3 shrink-0 rounded-full', swatch[note.color])}
        />
        {renaming ? (
          <RenameInput
            initial={note.title ?? title}
            placeholder={title || t.canvas.untitledNote}
            onDone={(value) => {
              setRenaming(false)
              if (value !== undefined) updateNote(note.id, { title: value.trim() || undefined })
            }}
          />
        ) : (
          <span className={cn('min-w-0 flex-1 truncate font-medium', !title && 'text-faint')}>
            {title || t.canvas.untitledNote}
          </span>
        )}
        {progress.total > 0 && (
          <span
            className={cn(
              'shrink-0 font-mono text-[11px]',
              progress.done === progress.total ? 'text-success' : 'text-faint',
            )}
          >
            {progress.done}/{progress.total}
          </span>
        )}
        {note.locked && <Lock size={12} className="shrink-0 text-faint" />}
        <div
          className="nodrag flex shrink-0 items-center"
          onDoubleClick={(e) => e.stopPropagation()}
        >
          {canEdit && (
            <IconButton
              label={editing ? t.canvas.preview : t.canvas.edit}
              onClick={() => setEditing(!editing)}
              className="size-6"
            >
              {editing ? <Eye size={13} /> : <Pencil size={12} />}
            </IconButton>
          )}
          <IconButton
            label={panel ? t.canvas.putBack : t.canvas.lift}
            onClick={() => lift(panel ? null : note.id)}
            className="size-6"
          >
            {panel ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </IconButton>
          <Menu
            align="right"
            items={[
              { id: 'rename', label: t.canvas.rename, onSelect: () => setRenaming(true) },
              {
                id: 'lock',
                label: note.locked ? t.canvas.unlock : t.canvas.lock,
                hint: note.locked ? undefined : t.canvas.lockHint,
                onSelect: () => {
                  flush()
                  setEditing(false)
                  updateNote(note.id, { locked: !note.locked })
                },
              },
              {
                id: 'delete',
                label: t.canvas.deleteNote,
                danger: true,
                onSelect: () => {
                  if (panel) lift(null)
                  remove([note.id])
                },
              },
            ]}
            trigger={({ open, toggle }) => (
              <IconButton
                label={t.canvas.noteOptions}
                active={open}
                onClick={toggle}
                className="size-6"
              >
                <MoreHorizontal size={14} />
              </IconButton>
            )}
          />
        </div>
      </header>

      <div className="nodrag nowheel nopan selectable min-h-0 flex-1 overflow-y-auto px-3.5 pb-3">
        {editing && canEdit ? (
          <textarea
            autoFocus
            value={text}
            spellCheck={false}
            onChange={(e) => edit(e.target.value)}
            onBlur={() => {
              flush()
              setEditing(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') e.currentTarget.blur()
            }}
            placeholder={t.canvas.notePlaceholder}
            className="block h-full w-full resize-none bg-transparent font-mono text-xs leading-relaxed text-fg placeholder:text-faint focus:outline-none"
          />
        ) : (
          <div
            className="min-h-full"
            onDoubleClick={() => canEdit && setEditing(true)}
            onClick={() => canEdit && !text.trim() && setEditing(true)}
          >
            {text.trim() ? (
              <Markdown
                source={text}
                onToggle={canEdit ? (line) => edit(toggleTask(text, line)) : undefined}
              />
            ) : (
              <p className="pt-1 text-xs text-faint">
                {content === null ? '' : t.canvas.emptyNote}
              </p>
            )}
            {canEdit && progress.total > 0 && (
              <AddItem onAdd={(item) => edit(appendItem(text, item))} />
            )}
          </div>
        )}
      </div>
      {error && <p className="shrink-0 px-3.5 pb-2 text-xs text-danger">{error}</p>}
    </div>
  )
}

/** Adds `- [ ] item` as the last line of a note. */
function appendItem(source: string, item: string): string {
  const body = source.replace(/\s+$/, '')
  return `${body}${body ? '\n' : ''}- [ ] ${item.trim()}\n`
}

/** The line under a checklist where new items are typed. */
function AddItem({ onAdd }: { onAdd(item: string): void }) {
  const [value, setValue] = useState('')
  const t = useT()
  return (
    <label className="mt-1.5 flex items-center gap-2 text-faint">
      <Plus size={13} className="shrink-0" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' || !value.trim()) return
          onAdd(value)
          setValue('')
        }}
        placeholder={t.canvas.addItem}
        className="min-w-0 flex-1 bg-transparent text-[13px] text-fg placeholder:text-faint focus:outline-none"
      />
    </label>
  )
}

interface RenameInputProps {
  initial: string
  placeholder: string
  /** The new name, or undefined when cancelled. */
  onDone(value: string | undefined): void
}

function RenameInput({ initial, placeholder, onDone }: RenameInputProps) {
  const [value, setValue] = useState(initial)
  const ref = useRef<HTMLInputElement>(null)
  // Enter or Escape finish it; the blur that follows must not finish it again.
  const done = useRef(false)
  const finish = (result: string | undefined): void => {
    if (done.current) return
    done.current = true
    onDone(result)
  }
  useEffect(() => ref.current?.select(), [])
  return (
    <input
      ref={ref}
      value={value}
      placeholder={placeholder}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => finish(value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') finish(value)
        if (e.key === 'Escape') finish(undefined)
      }}
      className="nodrag min-w-0 flex-1 rounded border border-line-strong bg-app px-1.5 py-0.5 font-medium focus:outline-none"
    />
  )
}
