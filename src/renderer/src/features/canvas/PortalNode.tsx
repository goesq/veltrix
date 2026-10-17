import { useEffect, useRef, useState } from 'react'
import { Handle, NodeResizer, Position, type NodeProps } from '@xyflow/react'
import { ArrowLeft, ArrowRight, Globe, Maximize2, Minimize2, RotateCw, X } from 'lucide-react'
import type { CanvasPortalNode } from '@shared/types'
import { IconButton } from '../../components/ui/Button'
import { useT } from '../../i18n'
import { api } from '../../lib/api'
import { cn } from '../../lib/cn'
import type { PortalView } from '../../webview'
import { useCanvasActions } from './canvasActions'
import { MIN_SIZE, type PortalFlowNode } from './canvasModel'
import { LiftedPlaceholder } from './LiftedPlaceholder'

/** Session partition of every portal; the main process enforces it anyway. */
const PARTITION = 'persist:veltrix-portals'

/** A web page on the canvas; agents linked to it drive it with `veltrix-send --browser`. */
export function PortalNode({ id, data, selected }: NodeProps<PortalFlowNode>) {
  const { lifted } = useCanvasActions()
  return (
    <>
      <NodeResizer
        isVisible
        minWidth={MIN_SIZE.portal.width}
        minHeight={MIN_SIZE.portal.height}
        lineClassName="canvas-resize-line"
        handleClassName="canvas-resize-handle"
      />
      <Handle type="target" position={Position.Left} className="canvas-handle" />
      <Handle type="source" position={Position.Right} className="canvas-handle" />
      {lifted === id ? (
        <LiftedPlaceholder selected={selected} />
      ) : (
        <PortalCard projectId={data.projectId} portal={data.portal} selected={selected} />
      )}
    </>
  )
}

interface PortalCardProps {
  projectId: string
  portal: CanvasPortalNode
  selected?: boolean
  /** Shown as a large panel over the canvas. */
  panel?: boolean
}

/** Address bar and page of a portal, on the canvas or lifted into a panel. */
export function PortalCard({ projectId, portal, selected, panel }: PortalCardProps) {
  const { remove, lift, rememberPortalUrl, justCreated } = useCanvasActions()
  const view = useRef<PortalView>(null)
  // The page loads from the saved address once; after that the webview navigates itself.
  const [initialUrl] = useState(portal.url)
  const [address, setAddress] = useState(portal.url === 'about:blank' ? '' : portal.url)
  // Read inside the webview's listeners, which are set up once.
  const editing = useRef(false)
  const remembered = useRef(portal.url)
  const [nav, setNav] = useState({ back: false, forward: false })
  const t = useT()

  useEffect(() => {
    const page = view.current
    if (!page) return
    let registered: number | undefined
    const onReady = (): void => {
      registered = page.getWebContentsId()
      api.portals.register(projectId, portal.id, registered)
    }
    const onNavigate = (): void => {
      const url = page.getURL()
      if (!editing.current) setAddress(url === 'about:blank' ? '' : url)
      setNav({ back: page.canGoBack(), forward: page.canGoForward() })
      if (url !== remembered.current) {
        remembered.current = url
        rememberPortalUrl(portal.id, url)
      }
    }
    page.addEventListener('dom-ready', onReady)
    page.addEventListener('did-navigate', onNavigate)
    page.addEventListener('did-navigate-in-page', onNavigate)
    return () => {
      page.removeEventListener('dom-ready', onReady)
      page.removeEventListener('did-navigate', onNavigate)
      page.removeEventListener('did-navigate-in-page', onNavigate)
      if (registered !== undefined) api.portals.unregister(projectId, portal.id, registered)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, portal.id])

  const go = (): void => {
    const url = toUrl(address)
    editing.current = false
    if (!url) return
    setAddress(url)
    void view.current?.loadURL(url).catch(() => undefined)
  }

  return (
    <div
      className={cn(
        'flex h-full w-full flex-col overflow-hidden rounded-lg border border-line bg-panel shadow-lg',
        selected && 'canvas-node-selected',
      )}
    >
      <header
        className="canvas-node-handle flex h-10 shrink-0 cursor-grab items-center gap-1 border-b border-line px-2 active:cursor-grabbing"
        onDoubleClick={() => lift(panel ? null : portal.id)}
        title={panel ? undefined : t.canvas.liftHint}
      >
        <Globe size={14} className="mx-1 shrink-0 text-tag-blue" />
        <div
          className="nodrag flex shrink-0 items-center"
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <IconButton
            label={t.canvas.portal.back}
            disabled={!nav.back}
            onClick={() => view.current?.goBack()}
            className="size-6"
          >
            <ArrowLeft size={13} />
          </IconButton>
          <IconButton
            label={t.canvas.portal.forward}
            disabled={!nav.forward}
            onClick={() => view.current?.goForward()}
            className="size-6"
          >
            <ArrowRight size={13} />
          </IconButton>
          <IconButton
            label={t.canvas.portal.reload}
            onClick={() => view.current?.reload()}
            className="size-6"
          >
            <RotateCw size={12} />
          </IconButton>
        </div>
        <input
          autoFocus={justCreated === portal.id}
          value={address}
          spellCheck={false}
          placeholder={t.canvas.portal.address}
          onFocus={(e) => {
            editing.current = true
            e.currentTarget.select()
          }}
          onBlur={() => (editing.current = false)}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') go()
            if (e.key === 'Escape') e.currentTarget.blur()
          }}
          onDoubleClick={(e) => e.stopPropagation()}
          className="nodrag h-7 min-w-0 flex-1 rounded-md border border-line bg-surface px-2.5 font-mono text-[11px] text-muted focus:border-line-strong focus:text-fg focus:outline-none"
        />
        <div
          className="nodrag flex shrink-0 items-center"
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <IconButton
            label={panel ? t.canvas.putBack : t.canvas.lift}
            onClick={() => lift(panel ? null : portal.id)}
            className="size-6"
          >
            {panel ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </IconButton>
          {!panel && (
            <IconButton
              label={t.canvas.removeFromCanvas}
              onClick={() => remove([portal.id])}
              className="size-6"
            >
              <X size={13} />
            </IconButton>
          )}
        </div>
      </header>
      <div className="nodrag nowheel nopan relative min-h-0 flex-1 bg-white">
        <webview ref={view} src={initialUrl} partition={PARTITION} className="h-full w-full" />
        {!address && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface text-center">
            <Globe size={22} className="text-faint" />
            <p className="max-w-72 text-xs text-muted">{t.canvas.portal.empty}</p>
          </div>
        )}
      </div>
    </div>
  )
}

/** What the address bar holds, as a page to load: a URL, a domain, or a web search. */
function toUrl(input: string): string | undefined {
  const text = input.trim()
  if (!text) return undefined
  if (/^https?:\/\//i.test(text)) return text
  if (/^[^\s]+\.[^\s]{2,}$/.test(text)) return `https://${text}`
  return `https://duckduckgo.com/?q=${encodeURIComponent(text)}`
}
