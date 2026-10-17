import { useState } from 'react'
import { NodeResizer, type NodeProps } from '@xyflow/react'
import { useT } from '../../i18n'
import { cn } from '../../lib/cn'
import { useCanvasActions } from './canvasActions'
import { MIN_SIZE, type TextFlowNode } from './canvasModel'

/** A free label on the canvas: titles for areas, quick ideas. Double-click to edit. */
export function TextNode({ id, data, selected }: NodeProps<TextFlowNode>) {
  const { updateText, remove, justCreated } = useCanvasActions()
  const [draft, setDraft] = useState<string | null>(justCreated === id ? data.text.text : null)
  const t = useT()

  const finish = (): void => {
    if (draft === null) return
    setDraft(null)
    if (!draft.trim()) remove([id])
    else if (draft !== data.text.text) updateText(id, { text: draft })
  }

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={MIN_SIZE.text.width}
        minHeight={MIN_SIZE.text.height}
        lineClassName="canvas-resize-line"
        handleClassName="canvas-resize-handle"
      />
      <div
        onDoubleClick={() => setDraft(data.text.text)}
        className={cn(
          'h-full w-full overflow-hidden rounded-md px-2 py-1 text-xl font-semibold leading-snug text-fg',
          selected && 'canvas-node-selected',
        )}
      >
        {draft === null ? (
          <p className="whitespace-pre-wrap break-words">{data.text.text}</p>
        ) : (
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={finish}
            onKeyDown={(e) => {
              if (e.key === 'Escape' || (e.key === 'Enter' && !e.shiftKey)) {
                e.preventDefault()
                e.currentTarget.blur()
              }
            }}
            placeholder={t.canvas.textPlaceholder}
            className="nodrag nowheel block h-full w-full resize-none bg-transparent placeholder:text-faint focus:outline-none"
          />
        )}
      </div>
    </>
  )
}
