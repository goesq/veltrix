/** The terminal font stack, as defined by `--font-mono` in styles.css. */
export function monoFontFamily(): string {
  return getComputedStyle(document.body).getPropertyValue('--font-mono')
}

let ready: Promise<void> | undefined

/**
 * Resolves once the terminal font is loaded (or failed to load), so xterm can measure its
 * cells with the font it will actually draw. Never rejects.
 */
export function monoFontReady(): Promise<void> {
  ready ??= document.fonts.load(`13px ${monoFontFamily()}`).then(
    () => undefined,
    () => undefined,
  )
  return ready
}
