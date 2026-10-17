// Electron's <webview> tag, used by browser portals on the canvas. The main process locks
// every one down when it attaches (see guardPortals in src/main/window.ts).

import type { DetailedHTMLProps, HTMLAttributes } from 'react'

/** The parts of Electron's WebviewTag the renderer uses. */
export interface PortalView extends HTMLElement {
  getWebContentsId(): number
  loadURL(url: string): Promise<void>
  getURL(): string
  getTitle(): string
  canGoBack(): boolean
  canGoForward(): boolean
  goBack(): void
  goForward(): void
  reload(): void
}

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      webview: DetailedHTMLProps<HTMLAttributes<PortalView>, PortalView> & {
        src?: string
        partition?: string
      }
    }
  }
}
