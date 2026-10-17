// Launch video (~21 s): what Veltrix does, in five beats.
//   1. hook: six messy terminals, agents working alone;
//   2. the terminals fall into Veltrix's clean grid;
//   3. the orchestrator: a goal is typed, the team assembles itself, tasks tick off;
//   4. the canvas: two agents message each other and tick a shared checklist;
//   5. the two agents become the logo's nodes, the links draw in, wordmark and call to action.
// The UI is drawn in a 1000×860 "content box" placed and scaled per format; the headline and
// the logo are drawn in video pixels. No sound: the headlines tell the story.
;(function () {
  const { el, group, text, FONT, measure } = window.Svg
  const { COLORS: C, LOGO } = window.Brand
  const { range, lerp, EASE, seeded, clamp } = window.Time
  const { pane, note, chip, headline, mix } = window.Ui

  const ACCENT = '#9cc0ea'
  const BOX = { width: 1000, height: 860 }

  const COPY = {
    en: {
      hook: '6 terminals. 6 agents.\n*Zero teamwork.*',
      grid: 'One clean grid\nfor *every terminal.*',
      team: 'Describe the goal.\n*The team builds itself.*',
      canvas: 'Agents *talk to each other*\nand tick the work off.',
      tagline: 'Terminals and AI agents\nthat work together.',
      pill: 'Free & open source · macOS & Windows',
      prompt: 'Build the login with a frontend and a backend agent',
      created: 'Agents created',
      tasks: ['POST /api/login with bcrypt', 'Login form with validation', 'Session cookie', 'E2E test for sign in'],
      checklist: 'Login sprint',
      items: ['Login form', 'POST /api/login', 'Session cookie', 'E2E test'],
      ask: 'What does /api/login return?',
      reply: '200 → { token, user }',
    },
    pt: {
      hook: '6 terminais. 6 agentes.\n*Zero trabalho em equipe.*',
      grid: 'Uma grade limpa\npara *todos os terminais.*',
      team: 'Descreva o objetivo.\n*O time se monta sozinho.*',
      canvas: 'Agentes *conversam entre si*\ne marcam o que fizeram.',
      tagline: 'Terminais e agentes de IA\nque trabalham juntos.',
      pill: 'Grátis e open source · macOS e Windows',
      prompt: 'Crie o login com um agente de frontend e um de backend',
      created: 'Agentes criados',
      tasks: ['POST /api/login com bcrypt', 'Formulário de login', 'Cookie de sessão', 'Teste E2E do login'],
      checklist: 'Sprint do login',
      items: ['Formulário de login', 'POST /api/login', 'Cookie de sessão', 'Teste E2E'],
      ask: 'O que /api/login retorna?',
      reply: '200 → { token, user }',
    },
  }

  // Timeline, in seconds.
  const T = {
    hook: [0.25, 3.15],
    panesIn: 0.1,
    grid: [3.2, 4.2],
    gridCopy: [3.35, 5.95],
    panesOut: [5.85, 6.35],
    teamCopy: [6.15, 10.55],
    composer: [6.1, 6.55],
    typing: [6.6, 7.9],
    send: 8.0,
    chips: [8.35, 8.5],
    rows: 8.7,
    ticks: [9.2, 9.65, 10.1, 10.5],
    goalOut: [10.65, 11.0],
    morph: [10.7, 11.45],
    canvasCopy: [10.8, 15.55],
    cable: [11.4, 11.8],
    noteIn: [11.5, 11.95],
    ask: [12.15, 12.6],
    reply: [13.25, 13.7],
    checks: [12.75, 13.5, 14.25, 14.9],
    canvasOut: [15.4, 15.8],
    toLogo: [15.6, 16.45],
    links: [16.35, 16.85],
    hub: [16.8, 17.15],
    ring: [17.1, 17.9],
    lockup: [17.55, 18.35],
    tagline: 18.3,
    pill: 18.9,
    duration: 21,
  }

  /** Where the content box and the headline go in each format. */
  function layoutFor(width, height) {
    if (height > width) {
      return { box: { cx: width / 2, cy: 1110, scale: 0.96 }, copy: { y: 330, size: 80, maxWidth: 940 }, logo: { cy: 860, width: 760 } }
    }
    if (width > height) {
      return { box: { cx: width / 2, cy: 640, scale: 0.86 }, copy: { y: 128, size: 60, maxWidth: 1500 }, logo: { cy: 470, width: 900 } }
    }
    return { box: { cx: width / 2, cy: 650, scale: 0.78 }, copy: { y: 122, size: 56, maxWidth: 960 }, logo: { cy: 470, width: 700 } }
  }

  // ── 1–2. Terminals: chaos, then the grid ───────────────────────────────────

  const PANES = [
    { title: 'api · npm run dev', dot: C.tag.green, lines: ['> api@1.0 dev', 'listening on :3000', 'GET /health 200', 'POST /login 500', 'Error: hash failed'] },
    { title: 'web · claude', dot: C.tag.blue, lines: ['✻ Claude Code', '⏺ Read src/App.tsx', '⏺ Edit Login.tsx', '  +64 −3', '⏺ Bash npm test'] },
    { title: 'db · psql', dot: C.tag.orange, lines: ['app=# \\dt', ' users', ' sessions', 'app=# select count(*)', ' 1204'] },
    { title: 'tests · vitest', dot: C.tag.purple, lines: [' ✓ auth.test.ts (6)', ' ✓ form.test.ts (4)', ' × session.test.ts', '   expected 200', ' Tests 1 failed'] },
    { title: 'docs · codex', dot: C.tag.pink, lines: ['codex exec "docs"', '⏺ Write README.md', '  +120 −8', '⏺ Edit api.md', 'done in 41s'] },
    { title: 'infra · terraform', dot: C.tag.yellow, lines: ['terraform plan', '+ aws_db.main', '~ aws_lb.web', 'Plan: 1 to add', '1 to change'] },
  ]

  const random = seeded(7)
  const MESS = PANES.map(() => ({
    x: 20 + random() * 580,
    y: 60 + random() * 470,
    rotate: (random() - 0.5) * 16,
    delay: random() * 0.7,
    speed: 2.6 + random() * 2,
  }))

  function gridCell(i) {
    const width = 320
    const height = 250
    const gap = 20
    return { x: (i % 3) * (width + gap), y: 170 + Math.floor(i / 3) * (height + gap), width, height }
  }

  function drawPanes(t) {
    if (t > T.panesOut[1]) return ''
    const out = EASE.standard(range(t, ...T.panesOut))
    return PANES.map((spec, i) => {
      const mess = MESS[i]
      const cell = gridCell(i)
      const inP = EASE.out(range(t, T.panesIn + mess.delay * 0.6, T.panesIn + mess.delay * 0.6 + 0.45))
      const toGrid = EASE.out(range(t, T.grid[0] + i * 0.05, T.grid[1] + i * 0.05))
      // A restless wobble while they are a mess.
      const wobble = (1 - toGrid) * Math.sin(t * mess.speed + i) * 2.5
      const x = lerp(mess.x, cell.x, toGrid)
      const y = lerp(mess.y, cell.y, toGrid)
      const width = lerp(380, cell.width, toGrid)
      const height = lerp(230, cell.height, toGrid)
      const lines = spec.lines.map((line) => ({
        text: line,
        color: /error|×|failed|500/i.test(line) ? C.danger : /✓|200|done/i.test(line) ? C.success : line.startsWith('⏺') ? C.fg : C.muted,
      }))
      const shown = clamp((t - T.panesIn - mess.delay) * 2.4, 0, lines.length)
      return group(
        {
          rotate: (mess.rotate + wobble) * (1 - toGrid),
          scale: lerp(0.85, 1, inP) * lerp(1, 0.92, out),
          origin: [x + width / 2, y + height / 2],
          opacity: inP * (1 - out),
          y: -out * 30,
        },
        pane({ x, y, width, height, title: spec.title, dot: spec.dot, lines, shown, active: i === 1 && toGrid > 0.5 }),
      )
    }).join('')
  }

  // ── 3. Orchestrator ────────────────────────────────────────────────────────

  const COMPOSER = { x: 40, y: 40, width: 920, height: 160 }
  const GOAL = { x: 40, y: 240, width: 920 }
  const CHIP_Y = GOAL.y + 74

  /** Where the two agent chips sit, right after the "Agents created" label. */
  function chipSpots(copy) {
    const startX = GOAL.x + 36 + measure(copy.created, '500 20px "Inter"') + 22
    const spots = [
      { label: 'frontend', color: C.tag.blue },
      { label: 'backend', color: C.tag.green },
    ]
    let x = startX
    return spots.map((spot) => {
      const width = measure(spot.label, '600 22px "Inter"') + 62
      const placed = { ...spot, x, y: CHIP_Y - 32, width }
      x += width + 14
      return placed
    })
  }

  function drawOrchestrator(t, copy) {
    if (t < T.composer[0] || t > T.goalOut[1] + 0.05) return ''
    const inP = EASE.out(range(t, ...T.composer))
    const out = EASE.standard(range(t, ...T.goalOut))
    const typed = copy.prompt.slice(0, Math.round(copy.prompt.length * range(t, ...T.typing)))
    const sent = t >= T.send
    // Like the app: the composer clears on send and says "Planning…" until the plan is back.
    const planning = sent && t < T.chips[0]
    const press = 1 - 0.06 * Math.sin(Math.PI * range(t, T.send - 0.12, T.send + 0.12))
    const caret = !sent && Math.floor(t * 2.2) % 2 === 0 ? 1 : 0

    const composer = [
      el('rect', { x: COMPOSER.x, y: COMPOSER.y, width: COMPOSER.width, height: COMPOSER.height, rx: 16, fill: C.panel, stroke: C.lineStrong, 'stroke-width': 2 }),
      text(sent ? '' : typed, { x: COMPOSER.x + 30, y: COMPOSER.y + 52, font: FONT.sans(25, 500), fill: C.fg }),
      sent || !caret
        ? ''
        : el('rect', { x: COMPOSER.x + 32 + window.Svg.measure(typed, '500 25px "Inter"'), y: COMPOSER.y + 30, width: 2.5, height: 30, fill: C.fg }),
      group(
        { scale: press, origin: [COMPOSER.x + COMPOSER.width - 80, COMPOSER.y + COMPOSER.height - 42] },
        [
          el('rect', { x: COMPOSER.x + COMPOSER.width - 150, y: COMPOSER.y + COMPOSER.height - 66, width: 126, height: 48, rx: 12, fill: planning || (typed && !sent) ? C.fg : C.raised }),
          text(planning ? 'Planning…' : 'Send ↑', {
            x: COMPOSER.x + COMPOSER.width - 87,
            y: COMPOSER.y + COMPOSER.height - 35,
            font: FONT.sans(20, 600),
            fill: planning || (typed && !sent) ? C.app : C.faint,
            anchor: 'middle',
          }),
        ].join(''),
      ),
    ].join('')

    let goal = ''
    if (sent) {
      const goalIn = EASE.out(range(t, T.send + 0.05, T.send + 0.45))
      const done = T.ticks.filter((tick) => t >= tick + 0.15).length
      const height = 120 + 4 * 92
      const rows = copy.tasks.map((task, i) => {
        const rowIn = EASE.out(range(t, T.rows + i * 0.08, T.rows + i * 0.08 + 0.4))
        const y = GOAL.y + 130 + i * 92
        const tick = range(t, T.ticks[i], T.ticks[i] + 0.25)
        const running = rowIn > 0 && tick === 0 && t > T.rows + 0.3
        const agent = i % 2 === 0 ? { label: 'backend', color: C.tag.green } : { label: 'frontend', color: C.tag.blue }
        return group({ opacity: rowIn, y: lerp(16, 0, rowIn) }, [
          el('rect', { x: GOAL.x + 24, y, width: GOAL.width - 48, height: 74, rx: 12, fill: C.surface, stroke: C.line, 'stroke-width': 2 }),
          tick > 0
            ? [
                el('rect', { x: GOAL.x + 52, y: y + 25, width: 26, height: 26, rx: 7, fill: C.success, opacity: Math.min(1, tick * 2) }),
                el('path', {
                  d: `M${GOAL.x + 58} ${y + 38}l6 6l10 -11`,
                  fill: 'none',
                  stroke: C.app,
                  'stroke-width': 3.5,
                  'stroke-linecap': 'round',
                  'stroke-linejoin': 'round',
                  'stroke-dasharray': 30,
                  'stroke-dashoffset': 30 * (1 - EASE.out(tick)),
                }),
              ].join('')
            : running
              ? el('circle', {
                  cx: GOAL.x + 65,
                  cy: y + 38,
                  r: 11,
                  fill: 'none',
                  stroke: C.fg,
                  'stroke-width': 3,
                  'stroke-dasharray': '42 28',
                  transform: `rotate(${(t * 420) % 360} ${GOAL.x + 65} ${y + 38})`,
                })
              : el('rect', { x: GOAL.x + 52, y: y + 25, width: 26, height: 26, rx: 7, fill: 'none', stroke: C.lineStrong, 'stroke-width': 2.5 }),
          text(task, { x: GOAL.x + 100, y: y + 46, font: FONT.sans(23, 500), fill: tick >= 1 ? C.faint : C.fg }),
          el('circle', { cx: GOAL.x + GOAL.width - 196, cy: y + 38, r: 6, fill: agent.color }),
          text(agent.label, { x: GOAL.x + GOAL.width - 180, y: y + 45, font: FONT.sans(20, 500), fill: agent.color }),
        ].join(''))
      })
      const progress = EASE.out(clamp(done / 4))
      goal = group({ opacity: goalIn, y: lerp(30, 0, goalIn) }, [
        el('rect', { x: GOAL.x, y: GOAL.y, width: GOAL.width, height, rx: 18, fill: C.panel, stroke: C.line, 'stroke-width': 2 }),
        text(copy.created, { x: GOAL.x + 36, y: CHIP_Y, font: FONT.sans(20, 500), fill: C.muted }),
        text(`${done}/4`, { x: GOAL.x + GOAL.width - 36, y: CHIP_Y, font: FONT.mono(20, 500), fill: done === 4 ? C.success : C.faint, anchor: 'end' }),
        el('rect', { x: GOAL.x + 36, y: GOAL.y + 104, width: GOAL.width - 72, height: 6, rx: 3, fill: C.raised }),
        el('rect', { x: GOAL.x + 36, y: GOAL.y + 104, width: (GOAL.width - 72) * progress, height: 6, rx: 3, fill: C.success }),
        rows.join(''),
      ].join(''))
    }

    // The chips stay put while the goal card leaves: they turn into the canvas agents.
    const chips = sent ? drawChips(t, copy) : ''
    return group({ opacity: inP * (1 - out), y: lerp(24, 0, inP) - out * 30 }, composer + goal) + (t < T.morph[0] ? chips : '')
  }

  function drawChips(t, copy) {
    return chipSpots(copy)
      .map((spot, i) => {
        const p = EASE.pop(range(t, T.chips[i], T.chips[i] + 0.35))
        return group({ scale: p, origin: [spot.x + 60, spot.y + 24], opacity: clamp(p) }, chip(spot))
      })
      .join('')
  }

  // ── 4. Canvas ──────────────────────────────────────────────────────────────

  const NODES = [
    { x: 20, y: 40, width: 400, height: 300, name: 'frontend', role: 'React UI', color: C.tag.blue, lines: ['⏺ Read login-sprint.md', '⏺ Write LoginForm.tsx', '  +64 −3', '⏺ veltrix-send backend', '⏺ Write login.spec.ts', '  ✓ 3 passed'] },
    { x: 580, y: 40, width: 400, height: 300, name: 'backend', role: 'Node API', color: C.tag.green, lines: ['⏺ Read api-spec.md', '⏺ Write api/login.ts', '  +48 −2', '⏺ Write password.ts', '⏺ veltrix-send frontend', '⏺ Write auth.ts'] },
  ]
  const NOTE = { x: 300, y: 450, width: 400 }

  function nodeBox(i, t, copy) {
    const node = NODES[i]
    const spot = chipSpots(copy)[i]
    const p = EASE.out(range(t, T.morph[0] + i * 0.06, T.morph[1] + i * 0.06))
    return {
      x: lerp(spot.x, node.x, p),
      y: lerp(spot.y, node.y, p),
      width: lerp(spot.width, node.width, p),
      height: lerp(48, node.height, p),
      p,
    }
  }

  /** A point along the cable from frontend to backend (0 → 1). */
  function cablePoint(u) {
    const a = [NODES[0].x + NODES[0].width, NODES[0].y + 150]
    const b = [NODES[1].x, NODES[1].y + 150]
    const c1 = [a[0] + 70, a[1]]
    const c2 = [b[0] - 70, b[1]]
    const m = 1 - u
    return [
      m ** 3 * a[0] + 3 * m * m * u * c1[0] + 3 * m * u * u * c2[0] + u ** 3 * b[0],
      m ** 3 * a[1] + 3 * m * m * u * c1[1] + 3 * m * u * u * c2[1] + u ** 3 * b[1],
    ]
  }

  function bubble(label, [cx, cy], p, color) {
    if (p <= 0) return ''
    const font = '500 20px "Inter"'
    const width = window.Svg.measure(label, font) + 44
    return group({ scale: lerp(0.8, 1, EASE.pop(p)), origin: [cx, cy], opacity: clamp(p * 1.6) }, [
      el('rect', { x: cx - width / 2, y: cy - 26, width, height: 52, rx: 26, fill: C.raised, stroke: mix(color, C.line, 0.6), 'stroke-width': 2 }),
      text(label, { x: cx, y: cy + 7, font: FONT.sans(20, 500), fill: C.fg, anchor: 'middle' }),
    ].join(''))
  }

  function drawCanvas(t, copy) {
    if (t < T.morph[0] || t > T.toLogo[0] + 0.01) return ''
    const out = EASE.standard(range(t, ...T.canvasOut))
    const dots = []
    const dotsIn = range(t, T.morph[0], T.morph[1]) * (1 - out)
    for (let x = -40; x <= BOX.width + 40; x += 40) for (let y = 0; y <= BOX.height; y += 40) dots.push(`M${x} ${y}h0.01`)
    const background = el('path', { d: dots.join(''), stroke: C.lineStrong, 'stroke-width': 3, 'stroke-linecap': 'round', opacity: dotsIn * 0.8 })

    const cableP = EASE.inOut(range(t, ...T.cable))
    const cable = el('path', {
      d: `M${cablePoint(0).join(' ')} C${NODES[0].x + NODES[0].width + 70} ${NODES[0].y + 150} ${NODES[1].x - 70} ${NODES[1].y + 150} ${cablePoint(1).join(' ')}`,
      fill: 'none',
      stroke: C.muted,
      'stroke-width': 3,
      'stroke-dasharray': 300,
      'stroke-dashoffset': 300 * (1 - cableP),
      opacity: 1 - out,
    })
    const pulse = (window, from, to, color) => {
      const u = EASE.inOut(range(t, ...window))
      if (u <= 0 || u >= 1) return ''
      const [x, y] = cablePoint(lerp(from, to, u))
      return el('circle', { cx: x, cy: y, r: 9, fill: color }) + el('circle', { cx: x, cy: y, r: 18, fill: color, opacity: 0.25 })
    }
    const askP = range(t, T.ask[0], T.ask[0] + 0.3) * (1 - range(t, T.reply[0] - 0.2, T.reply[0]))
    const replyP = range(t, T.reply[0] + 0.1, T.reply[0] + 0.4) * (1 - range(t, T.canvasOut[0] - 0.4, T.canvasOut[0]))

    const noteIn = EASE.out(range(t, ...T.noteIn))
    const done = T.checks.reduce((sum, start) => sum + range(t, start, start + 0.35), 0)
    const links = [0, 1].map((i) =>
      el('path', {
        d: `M${NODES[i].x + NODES[i].width / 2} ${NODES[i].y + NODES[i].height} C${NODES[i].x + NODES[i].width / 2} ${NOTE.y - 40} ${NOTE.x + NOTE.width / 2 + (i ? 80 : -80)} ${NOTE.y - 60} ${NOTE.x + NOTE.width / 2 + (i ? 80 : -80)} ${NOTE.y}`,
        fill: 'none',
        stroke: C.faint,
        'stroke-width': 3,
        'stroke-dasharray': '2 9',
        'stroke-linecap': 'round',
        opacity: noteIn * (1 - out),
      }),
    )

    const nodes = [0, 1].map((i) => {
      const box = nodeBox(i, t, copy)
      const node = NODES[i]
      const contentIn = range(t, T.morph[1] - 0.15, T.morph[1] + 0.25)
      const shown = clamp((t - T.morph[1]) * 2.4, 0, node.lines.length)
      const lines = node.lines.map((line) => ({ text: line, color: line.includes('✓') ? C.success : line.startsWith('⏺') ? C.fg : C.muted }))
      // Until the morph ends, it is still the chip; then the agent's pane takes over.
      if (box.p < 1 && contentIn === 0) {
        return el('rect', { x: box.x, y: box.y, width: box.width, height: box.height, rx: lerp(24, 14, box.p), fill: mix(node.color, C.panel, lerp(0.14, 0, box.p)), stroke: mix(node.color, C.line, lerp(0.45, 0, box.p)), 'stroke-width': 2 })
      }
      // As the canvas clears, the content fades and the bare card is left for the logo to take.
      const card = el('rect', { x: box.x, y: box.y, width: box.width, height: box.height, rx: 14, fill: C.surface, stroke: node.color, 'stroke-width': 2 })
      return card + group({ opacity: 1 - out }, pane({ ...box, title: `${node.name}  ·  ${node.role}`, dot: node.color, lines, shown: shown * contentIn, active: true }))
    })

    return [
      background,
      links.join(''),
      cable,
      t < T.canvasOut[1] ? nodes.join('') : '',
      group({ opacity: noteIn * (1 - out), y: lerp(30, 0, noteIn) }, note({ ...NOTE, title: copy.checklist, items: copy.items, done, tint: C.tag.green })),
      pulse(T.ask, 0, 1, C.tag.blue),
      pulse(T.reply, 1, 0, C.tag.green),
      bubble(copy.ask, [500, 392], askP, C.tag.blue),
      bubble(copy.reply, [500, 392], replyP, C.tag.green),
    ].join('')
  }

  // ── 5. Logo ────────────────────────────────────────────────────────────────

  function drawLogo(t, copy, stage, layout) {
    if (t < T.toLogo[0]) return ''
    const k = layout.logo.width / LOGO.viewBox.width // video pixels per logo unit
    const lockupShift = EASE.inOut(range(t, ...T.lockup))
    // The symbol starts centered on its own, then slides left as the wordmark comes in.
    const symbolCenter = LOGO.symbolBox.x + LOGO.symbolBox.width / 2
    const lockupCenter = LOGO.viewBox.x + LOGO.viewBox.width / 2
    const originX = stage.width / 2 - lerp(symbolCenter, lockupCenter, lockupShift) * k
    const originY = layout.logo.cy - (LOGO.symbolBox.y + LOGO.symbolBox.height / 2) * k
    const at = ({ cx, cy }) => [originX + cx * k, originY + cy * k]
    const { left, right, hub } = LOGO.nodes

    // The agents fly in from where they were on the canvas and shrink into the two nodes.
    const fly = EASE.inOut(range(t, ...T.toLogo))
    const nodes = [left, right].map((target, i) => {
      const n = NODES[i]
      const from = toStage([n.x + n.width / 2, n.y + n.height / 2], layout)
      const [tx, ty] = at(target)
      const width = lerp(n.width * layout.box.scale, target.r * 2 * k, fly)
      const height = lerp(n.height * layout.box.scale, target.r * 2 * k, fly)
      const cx = lerp(from[0], tx, fly)
      const cy = lerp(from[1], ty, fly)
      return el('rect', {
        x: cx - width / 2,
        y: cy - height / 2,
        width,
        height,
        rx: lerp(14 * layout.box.scale, target.r * k, fly),
        fill: mix(C.fg, C.surface, fly),
        stroke: fly < 1 ? mix(n.color, C.lineStrong, 1 - fly) : null,
        'stroke-width': 2,
      })
    })

    const linkP = EASE.inOut(range(t, ...T.links))
    const links = [left, right].map((from) => {
      const [x1, y1] = at(from)
      const [x2, y2] = at(hub)
      return el('line', { x1, y1, x2: lerp(x1, x2, linkP), y2: lerp(y1, y2, linkP), stroke: C.fg, 'stroke-width': LOGO.linkWidth * k, 'stroke-linecap': 'round', opacity: linkP > 0 ? 1 : 0 })
    })
    const hubP = EASE.pop(range(t, ...T.hub))
    const ringP = range(t, ...T.ring)
    const [hx, hy] = at(hub)
    const hubShapes = [
      ringP > 0 && ringP < 1
        ? el('circle', { cx: hx, cy: hy, r: hub.r * k * lerp(1, 2.6, EASE.out(ringP)), fill: 'none', stroke: C.fg, 'stroke-width': 2.5, opacity: 1 - ringP })
        : '',
      el('circle', { cx: hx, cy: hy, r: hub.r * k * hubP, fill: C.fg }),
    ]

    // The wordmark is revealed left to right as the symbol slides over.
    const reveal = EASE.out(range(t, T.lockup[0] + 0.15, T.lockup[1] + 0.2))
    const wx = originX + LOGO.wordmark.x * k
    const wy = originY + LOGO.wordmark.y * k
    // The clip sits on an untransformed group, so its rectangle is in video pixels.
    const wordmark =
      reveal > 0
        ? el('clipPath', { id: 'wordmark-reveal' }, el('rect', { x: wx - 10, y: wy - 50 * k, width: (LOGO.wordmark.width * k + 20) * reveal, height: 62 * k })) +
          el('g', { 'clip-path': 'url(#wordmark-reveal)' }, el('path', { d: LOGO.wordmark.path, fill: C.fg, transform: `translate(${wx} ${wy}) scale(${k})` }))
        : ''

    const below = layout.logo.cy + (LOGO.symbolBox.height / 2) * k + 90
    const taglineSize = Math.min(54, stage.width / 22)
    const tagline = headline(copy.tagline, { cx: stage.width / 2, y: below + taglineSize, size: taglineSize, maxWidth: stage.width * 0.86, t, start: T.tagline, end: Infinity, accent: ACCENT, color: C.muted })
    const pillP = EASE.out(range(t, T.pill, T.pill + 0.5))
    const pillFont = '500 26px "Inter"'
    const pillWidth = window.Svg.measure(copy.pill, pillFont) + 64
    const pillY = below + taglineSize * 2.3 + 70
    const pill = group({ opacity: pillP, y: lerp(20, 0, pillP) }, [
      el('rect', { x: stage.width / 2 - pillWidth / 2, y: pillY, width: pillWidth, height: 60, rx: 30, fill: C.panel, stroke: C.lineStrong, 'stroke-width': 2 }),
      el('circle', { cx: stage.width / 2 - pillWidth / 2 + 32, cy: pillY + 30, r: 6, fill: C.success }),
      text(copy.pill, { x: stage.width / 2 + 10, y: pillY + 39, font: FONT.sans(26, 500), fill: C.fg, anchor: 'middle' }),
    ].join(''))

    return [links.join(''), nodes.join(''), hubShapes.join(''), wordmark, tagline, pill].join('')
  }

  /** A point of the content box in video pixels. */
  function toStage([x, y], layout) {
    const { cx, cy, scale } = layout.box
    return [cx + (x - BOX.width / 2) * scale, cy + (y - BOX.height / 2) * scale]
  }

  // ── Scene ──────────────────────────────────────────────────────────────────

  window.Scenes = window.Scenes || {}
  window.Scenes.launch = {
    duration: T.duration,
    draw(t, { width, height, language }) {
      const copy = COPY[language] || COPY.en
      const layout = layoutFor(width, height)
      const { cx, cy, scale } = layout.box
      const box = el('g', { transform: `translate(${cx - (BOX.width / 2) * scale} ${cy - (BOX.height / 2) * scale}) scale(${scale})` }, [
        drawPanes(t),
        drawOrchestrator(t, copy),
        drawCanvas(t, copy),
      ])
      const copyAt = (source, [start, end]) =>
        headline(source, { cx: width / 2, y: layout.copy.y, size: layout.copy.size, maxWidth: layout.copy.maxWidth, t, start, end, accent: ACCENT })
      const vignette =
        el('defs', {}, el('radialGradient', { id: 'vignette', cx: '50%', cy: '45%', r: '75%' }, [
          el('stop', { offset: '55%', 'stop-color': '#000', 'stop-opacity': 0 }),
          el('stop', { offset: '100%', 'stop-color': '#000', 'stop-opacity': 0.45 }),
        ])) + el('rect', { width, height, fill: 'url(#vignette)' })
      return [
        el('rect', { width, height, fill: '#141414' }),
        box,
        copyAt(copy.hook, T.hook),
        copyAt(copy.grid, T.gridCopy),
        copyAt(copy.team, T.teamCopy),
        copyAt(copy.canvas, T.canvasCopy),
        drawLogo(t, copy, { width, height }, layout),
        vignette,
      ].join('')
    },
  }
})()
