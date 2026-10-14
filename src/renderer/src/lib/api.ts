/** Typed bridge to the main process, exposed by the preload script. */
export const api = window.veltrix

export const isMac = api.platform === 'darwin'
