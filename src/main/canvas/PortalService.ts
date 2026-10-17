import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { webContents, type WebContents } from 'electron'
import { canvasOf, isPortalUrl, portalsOfAgent } from '@shared/canvas'
import { PROJECT_WORKSPACE_DIR } from '@shared/constants'
import type { Agent, CanvasPortalNode, Project } from '@shared/types'
import type { SendResponse } from '../live/protocol'
import { pathForAgent } from '../projects/agentPaths'

/** What an agent can do with a portal. */
export const PORTAL_ACTIONS = ['open', 'read', 'click', 'type', 'screenshot', 'back'] as const
export type PortalAction = (typeof PORTAL_ACTIONS)[number]

/** Most text a `read` returns; agents can scroll the page by clicking or reading again. */
const MAX_READ_CHARS = 12_000
/** How long an action waits for the page to settle after it. */
const SETTLE_MS = 700
const LOAD_TIMEOUT_MS = 20_000

/**
 * Lets live agents drive the portals (web pages) they are linked to on the canvas. Each
 * portal's page is a <webview> in the window; the renderer registers its WebContents here
 * when it attaches. Actions run in the page's own isolated world.
 */
export class PortalService {
  private readonly views = new Map<string, number>()

  register(projectId: string, portalId: string, webContentsId: number): void {
    const view = webContents.fromId(webContentsId)
    // Only guest pages of a <webview> may be registered, never the app itself.
    if (view?.getType() !== 'webview') return
    this.views.set(key(projectId, portalId), webContentsId)
  }

  unregister(projectId: string, portalId: string, webContentsId: number): void {
    if (this.views.get(key(projectId, portalId)) === webContentsId) {
      this.views.delete(key(projectId, portalId))
    }
  }

  /** The portals an agent may use, as listed to it. */
  describe(project: Project, agent: Agent): string {
    const portals = portalsOfAgent(canvasOf(project), agent.id)
    if (portals.length === 0) return 'No browser portals are linked to you.'
    return `Browser portals you can use:\n${portals.map((p) => `- "${portalName(p)}": ${p.url}`).join('\n')}`
  }

  async run(
    project: Project,
    agent: Agent,
    action: string,
    args: string[],
    name?: string,
  ): Promise<SendResponse> {
    const linked = portalsOfAgent(canvasOf(project), agent.id)
    const portal = pick(linked, name)
    if (!portal) {
      return {
        ok: false,
        error: linked.length
          ? `Name the portal with --portal: ${linked.map((p) => `"${portalName(p)}"`).join(', ')}.`
          : 'No browser portal is linked to you. Ask the user to link one on the canvas.',
      }
    }
    const view = this.view(project.id, portal.id)
    if (!view)
      return { ok: false, error: `The portal "${portalName(portal)}" is not open on the canvas.` }

    try {
      switch (action as PortalAction) {
        case 'open':
          return await open(view, args[0])
        case 'read':
          return { ok: true, text: await read(view) }
        case 'click':
          return await click(view, args.join(' '))
        case 'type':
          return await type(view, args[0], args.slice(1).join(' '))
        case 'screenshot':
          return await screenshot(view, project, portal, agent)
        case 'back':
          view.navigationHistory.goBack()
          await settle()
          return { ok: true, text: `Back to ${view.getURL()}` }
        default:
          return {
            ok: false,
            error: `Unknown action "${action}". Use: ${PORTAL_ACTIONS.join(', ')}.`,
          }
      }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  private view(projectId: string, portalId: string): WebContents | undefined {
    const id = this.views.get(key(projectId, portalId))
    const view = id === undefined ? undefined : webContents.fromId(id)
    return view && !view.isDestroyed() ? view : undefined
  }
}

const key = (projectId: string, portalId: string): string => `${projectId}:${portalId}`

/** How agents address a portal: its title, or the host of its page. */
export function portalName(portal: CanvasPortalNode): string {
  if (portal.title?.trim()) return portal.title.trim()
  try {
    return new URL(portal.url).host || 'browser'
  } catch {
    return 'browser'
  }
}

function pick(portals: CanvasPortalNode[], name?: string): CanvasPortalNode | undefined {
  if (!name) return portals.length === 1 ? portals[0] : undefined
  const wanted = name.trim().toLowerCase()
  return portals.find((p) => p.id === name || portalName(p).toLowerCase() === wanted)
}

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, SETTLE_MS))

async function open(view: WebContents, raw: string | undefined): Promise<SendResponse> {
  if (!raw) return { ok: false, error: 'Usage: --browser open <url>' }
  const url = /^[a-z]+:/i.test(raw) ? raw : `https://${raw}`
  if (!isPortalUrl(url)) return { ok: false, error: 'Portals only open http and https pages.' }
  await Promise.race([
    view.loadURL(url),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('The page took too long to load.')), LOAD_TIMEOUT_MS),
    ),
  ])
  return { ok: true, text: `Opened ${view.getURL()} — "${view.getTitle()}". Run read to see it.` }
}

/**
 * The page as text, plus its links, buttons and fields numbered, so `click 3` or `type 5`
 * can point at them. The numbers are stamped on the elements for the next action.
 */
async function read(view: WebContents): Promise<string> {
  const page: { title: string; url: string; text: string; elements: string[] } =
    await view.executeJavaScript(`(() => {
      const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 }
      const label = (el) => (el.innerText || el.value || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('title') || el.name || '').trim().replace(/\\s+/g, ' ').slice(0, 80)
      const els = [...document.querySelectorAll('a[href], button, input:not([type=hidden]), textarea, select, [role=button], [role=link]')].filter(visible)
      document.querySelectorAll('[data-veltrix-ref]').forEach((el) => el.removeAttribute('data-veltrix-ref'))
      const elements = els.slice(0, 150).map((el, i) => {
        el.setAttribute('data-veltrix-ref', String(i + 1))
        const kind = el.tagName === 'A' ? 'link' : el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' ? 'field' : el.tagName === 'SELECT' ? 'select' : 'button'
        return '[' + (i + 1) + '] ' + kind + ': ' + (label(el) || '(no label)')
      })
      return { title: document.title, url: location.href, text: (document.body ? document.body.innerText : '').replace(/\\n{3,}/g, '\\n\\n'), elements }
    })()`)
  const text =
    page.text.length > MAX_READ_CHARS ? `${page.text.slice(0, MAX_READ_CHARS)}\n…(cut)` : page.text
  return `${page.title}\n${page.url}\n\n${text}\n\nInteractive elements (use the number with click or type):\n${page.elements.join('\n')}`
}

/** Finds an element by the number `read` gave it, or by its visible text. */
const FIND = `(target) => {
  if (/^\\d+$/.test(target)) return document.querySelector('[data-veltrix-ref="' + target + '"]')
  const wanted = target.toLowerCase()
  const candidates = [...document.querySelectorAll('a[href], button, input, textarea, select, [role=button], [role=link], label')]
  return candidates.find((el) => (el.innerText || el.value || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').trim().toLowerCase() === wanted)
    || candidates.find((el) => (el.innerText || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').toLowerCase().includes(wanted))
}`

async function click(view: WebContents, target: string): Promise<SendResponse> {
  if (!target)
    return { ok: false, error: 'Usage: --browser click <number from read | visible text>' }
  const clicked: string | null = await view.executeJavaScript(`(() => {
    const el = (${FIND})(${JSON.stringify(target)})
    if (!el) return null
    el.scrollIntoView({ block: 'center' })
    el.click()
    return (el.innerText || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 80)
  })()`)
  if (clicked === null)
    return { ok: false, error: `Nothing matches "${target}". Run read to list the elements.` }
  await settle()
  return { ok: true, text: `Clicked "${clicked}". Now at ${view.getURL()}.` }
}

async function type(
  view: WebContents,
  target: string | undefined,
  text: string,
): Promise<SendResponse> {
  if (!target || !text)
    return {
      ok: false,
      error: 'Usage: --browser type <number | field label> "text" (end with \\n to submit)',
    }
  const focused: boolean = await view.executeJavaScript(`(() => {
    const el = (${FIND})(${JSON.stringify(target)})
    if (!el) return false
    el.scrollIntoView({ block: 'center' })
    el.focus()
    if ('select' in el) el.select()
    return true
  })()`)
  if (!focused)
    return { ok: false, error: `No field matches "${target}". Run read to list the elements.` }
  const submit = text.endsWith('\\n') || text.endsWith('\n')
  await view.insertText(text.replace(/(\\n|\n)$/, ''))
  if (submit) {
    for (const type of ['keyDown', 'char', 'keyUp'] as const)
      view.sendInputEvent({ type, keyCode: 'Enter' })
    await settle()
  }
  return {
    ok: true,
    text: `Typed into "${target}"${submit ? ' and pressed Enter' : ''}. Now at ${view.getURL()}.`,
  }
}

async function screenshot(
  view: WebContents,
  project: Project,
  portal: CanvasPortalNode,
  agent: Agent,
): Promise<SendResponse> {
  const image = await view.capturePage()
  const relative = `${PROJECT_WORKSPACE_DIR}/portals/${portal.id}.png`
  await mkdir(join(project.path, PROJECT_WORKSPACE_DIR, 'portals'), { recursive: true })
  await writeFile(join(project.path, relative), image.toPNG())
  return {
    ok: true,
    text: `Saved a screenshot of ${view.getURL()} to ${pathForAgent(project, agent, relative)}. Open that image to see the page.`,
  }
}
