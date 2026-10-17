// Builds SVG markup as strings. A frame is drawn by turning the scene state at `t` into one
// string, which keeps drawing a pure function of time.
;(function () {
  const escape = (s) =>
    String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

  /** `<tag a="b">children</tag>`; attributes that are null, undefined or false are left out. */
  function el(tag, attrs = {}, children = '') {
    const list = Object.entries(attrs)
      .filter(([, v]) => v !== null && v !== undefined && v !== false)
      .map(([k, v]) => ` ${k}="${escape(typeof v === 'number' ? round(v) : v)}"`)
      .join('')
    const inner = Array.isArray(children) ? children.join('') : children
    return inner === '' && tag !== 'text' ? `<${tag}${list}/>` : `<${tag}${list}>${inner}</${tag}>`
  }

  const round = (n) => Math.round(n * 100) / 100

  /** A group moved, scaled around `origin` and faded. */
  function group({ x = 0, y = 0, scale = 1, origin = [0, 0], opacity = 1, rotate = 0 }, children) {
    if (opacity <= 0.001) return ''
    const [ox, oy] = origin
    const transform =
      `translate(${round(x + ox)} ${round(y + oy)})` +
      (rotate ? ` rotate(${round(rotate)})` : '') +
      (scale !== 1 ? ` scale(${round(scale)})` : '') +
      ` translate(${round(-ox)} ${round(-oy)})`
    return el('g', { transform, opacity: opacity < 1 ? opacity : null }, children)
  }

  const context = document.createElement('canvas').getContext('2d')
  /** Width of `text` in pixels, with the font as CSS shorthand ("600 64px Inter"). */
  function measure(text, font) {
    context.font = font
    return context.measureText(text).width
  }

  const FONT = {
    sans: (size, weight = 400) => ({ family: 'Inter', size, weight }),
    mono: (size, weight = 400) => ({ family: 'JetBrains Mono', size, weight }),
  }
  const css = (font) => `${font.weight} ${font.size}px "${font.family}"`

  /** One line of text. `anchor` is start, middle or end. */
  function text(content, { x, y, font, fill, anchor = 'start', opacity = 1, spacing }) {
    return el(
      'text',
      {
        x,
        y,
        fill,
        opacity: opacity < 1 ? opacity : null,
        'font-family': font.family,
        'font-size': font.size,
        'font-weight': font.weight,
        'text-anchor': anchor,
        'letter-spacing': spacing ?? null,
      },
      escape(content),
    )
  }

  window.Svg = { el, group, measure, text, FONT, css, escape, round }
})()
