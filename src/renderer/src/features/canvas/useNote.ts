import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api'
import { noteBus } from '../../lib/noteBus'

/** Pause in typing before an edit is written to the note's file. */
const SAVE_DELAY_MS = 300

/**
 * The content of a canvas note, kept in step with its file: edits are saved shortly after
 * typing stops, and changes made on disk (an agent ticking a checklist) show up at once,
 * unless the user is in the middle of an edit, which wins.
 */
export function useNote(projectId: string, noteId: string) {
  const [content, setContent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  /** Content waiting to be written, if any. */
  const pending = useRef<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const flush = useCallback(() => {
    clearTimeout(timer.current)
    const next = pending.current
    if (next === null) return
    pending.current = null
    api.notes.write(projectId, noteId, next).then(
      () => setError(null),
      (e: unknown) => setError(e instanceof Error ? e.message : String(e)),
    )
  }, [projectId, noteId])

  useEffect(() => {
    let alive = true
    void api.notes.read(projectId, noteId).then((text) => {
      if (alive && pending.current === null) setContent(text)
    })
    const detach = noteBus.attach(projectId, noteId, (text) => {
      if (pending.current === null) setContent(text)
    })
    return () => {
      alive = false
      detach()
      flush()
    }
  }, [projectId, noteId, flush])

  const edit = useCallback(
    (next: string) => {
      setContent(next)
      pending.current = next
      clearTimeout(timer.current)
      timer.current = setTimeout(flush, SAVE_DELAY_MS)
    },
    [flush],
  )

  return { content, edit, flush, error }
}
