/** Typed bridge to the main process, exposed by the preload script. */
export const api = window.veltrix

export const isMac = api.platform === 'darwin'
export const isWindows = api.platform === 'win32'
