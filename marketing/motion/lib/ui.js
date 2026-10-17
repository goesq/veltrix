// Pieces of the Veltrix interface drawn for video: panes, agent nodes, notes, chips and the
// headline. They take plain numbers (already animated by the scene) and return SVG markup.
;(function () {
  const { el, text, FONT, measure, css, round } = window.Svg
  const { COLORS: C } = window.Brand
  const { range, lerp, EASE } = window.Time

  /** A terminal pane as in the grid: header with a colored dot and a title, then mono lines. */
  function pane({ x, y, width, height, title, dot, lines = [], shown = lines.length, cursor, active, scale = 1 }) {
    const header = 44 * scale
    const font = FONT.mono(17 * scale)
    const lineHeight = 27 * scale
    const visible = lines.slice(0, Math.ceil(shown))
    const body = visible.map((line, i) => {
      const partial = i === Math.ceil(shown) - 1 ? shown - Math.floor(shown) : 0
      const content = partial > 0 ? line.text.slice(0, Math.round(line.text.length * partial)) : line.text
      return text(content, {
        x: x + 22 * scale,
        y: y + header + 34 * scale + i * lineHeight,
        font,
        fill: line.color ?? C.muted,
      })
    })
    if (cursor) {
      const last = visible.length ? visible[visible.length - 1] : null
      const cx = x + 22 * scale + (last ? measure(last.text, css(font)) + 6 * scale : 0)
      const cy = y + header + 16 * scale + Math.max(0, visible.length - 1) * lineHeight
      body.push(el('rect', { x: cx, y: cy, width: 10 * scale, height: 22 * scale, fill: C.fg, opacity: cursor }))
    }
    return [
      el('rect', {
        x,
        y,
        width,
        height,
        rx: 14 * scale,
        fill: C.surface,
        stroke: active ? C.lineStrong : C.line,
        'stroke-width': 2 * scale,
      }),
      el('line', { x1: x, x2: x + width, y1: y + header, y2: y + header, stroke: C.line, 'stroke-width': 2 * scale }),
      el('circle', { cx: x + 22 * scale, cy: y + header / 2, r: 5 * scale, fill: dot }),
      text(title, {
        x: x + 38 * scale,
        y: y + header / 2 + 6 * scale,
        font: FONT.sans(17 * scale, 500),
        fill: active ? C.fg : C.muted,
      }),
      el('clipPath', { id: `clip-${round(x)}-${round(y)}` }, el('rect', { x, y: y + header, width, height: height - header })),
      el('g', { 'clip-path': `url(#clip-${round(x)}-${round(y)})` }, body),
    ].join('')
  }

  /** A note on the canvas: tinted card, title and a checklist ticked up to `done` items. */
  function note({ x, y, width, title, items, done, tint, scale = 1 }) {
    const s = scale
    const rowHeight = 46 * s
    const height = 92 * s + items.length * rowHeight
    // An item counts as done halfway through its tick, as the check lands.
    const count = Math.floor(done + 0.5)
    const rows = items.map((item, i) => {
      const tick = Math.max(0, Math.min(1, done - i)) // 0→1 while this item is being ticked
      const cy = y + 100 * s + i * rowHeight
      const box = 24 * s
      const p = EASE.pop(tick)
      return [
        el('rect', {
          x: x + 26 * s,
          y: cy - box / 2,
          width: box,
          height: box,
          rx: 6 * s,
          fill: tick > 0 ? C.success : 'none',
          'fill-opacity': tick > 0 ? Math.min(1, tick * 2) : null,
          stroke: tick > 0 ? C.success : C.lineStrong,
          'stroke-width': 2.5 * s,
        }),
        tick > 0
          ? el('path', {
              d: `M${x + 32 * s} ${cy}l${5 * s} ${5 * s}l${9 * s} ${-10 * s}`,
              fill: 'none',
              stroke: C.app,
              'stroke-width': 3.5 * s,
              'stroke-linecap': 'round',
              'stroke-linejoin': 'round',
              'stroke-dasharray': 30 * s,
              'stroke-dashoffset': 30 * s * (1 - p),
            })
          : '',
        text(item, {
          x: x + 66 * s,
          y: cy + 7 * s,
          font: FONT.sans(21 * s, 500),
          fill: tick >= 1 ? C.faint : C.fg,
        }),
        tick > 0
          ? el('line', {
              x1: x + 66 * s,
              x2: x + 66 * s + measure(item, css(FONT.sans(21 * s, 500))) * Math.min(1, tick * 1.4),
              y1: cy,
              y2: cy,
              stroke: C.faint,
              'stroke-width': 2 * s,
            })
          : '',
      ].join('')
    })
    return [
      el('rect', { x, y, width, height, rx: 16 * s, fill: mix(tint, C.panel, 0.12), stroke: mix(tint, C.line, 0.4), 'stroke-width': 2 * s }),
      el('circle', { cx: x + 30 * s, cy: y + 36 * s, r: 7 * s, fill: tint }),
      text(title, { x: x + 48 * s, y: y + 43 * s, font: FONT.sans(22 * s, 600), fill: C.fg }),
      text(`${count}/${items.length}`, {
        x: x + width - 24 * s,
        y: y + 43 * s,
        font: FONT.mono(18 * s, 500),
        fill: count === items.length ? C.success : C.faint,
        anchor: 'end',
      }),
      rows.join(''),
    ].join('')
  }

  /** A colored dot and a name in a rounded pill, like an agent tag in the orchestrator. */
  function chip({ x, y, label, color, scale = 1 }) {
    const font = FONT.sans(22 * scale, 600)
    const width = measure(label, css(font)) + 62 * scale
    return [
      el('rect', { x, y, width, height: 48 * scale, rx: 24 * scale, fill: mix(color, C.panel, 0.14), stroke: mix(color, C.line, 0.45), 'stroke-width': 2 * scale }),
      el('circle', { cx: x + 26 * scale, cy: y + 24 * scale, r: 7 * scale, fill: color }),
      text(label, { x: x + 42 * scale, y: y + 32 * scale, font, fill: color }),
    ].join('')
  }

  /**
   * The headline of a beat, entering word by word and leaving together. `*word*` is drawn in
   * the accent color; `\n` breaks lines. Centered on `cx`; `y` is the first baseline.
   */
  function headline(source, { cx, y, size: wanted, maxWidth = Infinity, t, start, end, accent, color = C.fg }) {
    if (t < start || t > end) return ''
    // Shrinks to fit the widest line in `maxWidth`.
    const widest = Math.max(
      ...source.split('\n').map((line) => measure(line.replace(/\*/g, ''), css({ family: 'Inter', size: wanted, weight: 700 }))),
    )
    const size = widest > maxWidth ? wanted * (maxWidth / widest) : wanted
    const font = { family: 'Inter', size, weight: 700 }
    // Words are drawn one by one with tightened tracking; measure them the same way.
    const tracking = -size * 0.025
    const space = measure(' ', css(font)) + tracking
    let highlighted = false
    let index = 0
    const out = []
    const leave = EASE.standard(range(t, end - 0.35, end))
    source.split('\n').forEach((line, row) => {
      const words = line.split(' ').map((raw) => {
        const opens = raw.startsWith('*')
        const closes = raw.endsWith('*')
        if (opens) highlighted = true
        const word = { text: raw.replace(/\*/g, ''), accent: highlighted }
        if (closes) highlighted = false
        word.width = measure(word.text, css(font)) + tracking * word.text.length
        return word
      })
      const total = words.reduce((sum, w) => sum + w.width, 0) + space * (words.length - 1)
      let x = cx - total / 2
      for (const word of words) {
        const p = EASE.out(range(t, start + index * 0.055, start + index * 0.055 + 0.5))
        out.push(
          text(word.text, {
            x,
            y: y + row * size * 1.14 + lerp(size * 0.5, 0, p) - leave * size * 0.3,
            font,
            fill: word.accent ? accent : color,
            opacity: p * (1 - leave),
            spacing: tracking,
          }),
        )
        x += word.width + space
        index++
      }
    })
    return out.join('')
  }

  /** Mixes `color` into `base` by `amount` (0 → base, 1 → color). Both as #rrggbb. */
  function mix(color, base, amount) {
    const a = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16))
    const b = [1, 3, 5].map((i) => parseInt(base.slice(i, i + 2), 16))
    return `rgb(${a.map((v, i) => Math.round(lerp(b[i], v, amount))).join(',')})`
  }

  window.Ui = { pane, note, chip, headline, mix }
})()
