// Time helpers shared by the scenes. Everything is a pure function of `t` (seconds): the same
// instant always draws the same frame, which is what lets the video be exported frame by frame.
;(function () {
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v))

  /** Progress 0→1 of `t` inside [start, end]. */
  const range = (t, start, end) => clamp((t - start) / (end - start))

  const lerp = (a, b, p) => a + (b - a) * p

  /** The CSS cubic-bezier(x1, y1, x2, y2) curve, so motion matches the app's own easings. */
  function cubicBezier(x1, y1, x2, y2) {
    const bx = (u) => 3 * x1 * u * (1 - u) ** 2 + 3 * x2 * u ** 2 * (1 - u) + u ** 3
    const by = (u) => 3 * y1 * u * (1 - u) ** 2 + 3 * y2 * u ** 2 * (1 - u) + u ** 3
    return (x) => {
      if (x <= 0) return 0
      if (x >= 1) return 1
      let lo = 0
      let hi = 1
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2
        if (bx(mid) < x) lo = mid
        else hi = mid
      }
      return by((lo + hi) / 2)
    }
  }

  const EASE = {
    standard: cubicBezier(0.4, 0, 0.2, 1),
    out: cubicBezier(0.22, 1, 0.36, 1), // the app's pane and lift motion
    inOut: cubicBezier(0.65, 0, 0.35, 1),
    pop: cubicBezier(0.34, 1.56, 0.64, 1), // the logo's node pop
  }

  /** Seeded random (mulberry32): "human" variation that renders the same every time. */
  function seeded(seed) {
    let a = seed >>> 0
    return () => {
      a = (a + 0x6d2b79f5) >>> 0
      let x = Math.imul(a ^ (a >>> 15), 1 | a)
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296
    }
  }

  window.Time = { clamp, range, lerp, cubicBezier, EASE, seeded }
})()
