/** Pane sizes the user dragged to, remembered on this machine per layout (view state, not settings). */
const STORAGE_KEY = 'veltrix.layoutSizes'

type Sizes = Record<string, number[]>

function readAll(): Sizes {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    return parsed && typeof parsed === 'object' ? (parsed as Sizes) : {}
  } catch {
    return {}
  }
}

/** Saved sizes for a layout, or `fallback` when none were saved (or they no longer fit). */
export function loadSizes(id: string, fallback: number[]): number[] {
  const saved = readAll()[id]
  const valid =
    Array.isArray(saved) &&
    saved.length === fallback.length &&
    saved.every((n) => typeof n === 'number' && Number.isFinite(n) && n > 0)
  return valid ? saved : fallback
}

export function saveSizes(id: string, sizes: number[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readAll(), [id]: sizes }))
  } catch {
    // Storage unavailable: sizes just won't persist.
  }
}

/**
 * Moves the boundary after `index` by `delta` pixels, trading size between the two panes
 * beside it. `sizes` are relative weights (like `fr` units) spread over `trackPx` pixels;
 * neither pane is allowed below `minPx`.
 */
export function resizePair(
  sizes: number[],
  index: number,
  delta: number,
  trackPx: number,
  minPx: number,
): number[] {
  const total = sizes.reduce((sum, n) => sum + n, 0)
  if (trackPx <= 0 || total <= 0) return sizes
  const perPixel = total / trackPx
  const pair = sizes[index] + sizes[index + 1]
  const min = Math.min(minPx * perPixel, pair / 2)
  const first = Math.min(Math.max(sizes[index] + delta * perPixel, min), pair - min)
  const next = [...sizes]
  next[index] = first
  next[index + 1] = pair - first
  return next
}
