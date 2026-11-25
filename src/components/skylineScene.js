// Login-screen skyline scene, ported from login-skyline-animated.svg.
//
// A skyline around City Hall where six buildings each carry one step of the holding-tax collection
// cycle, left to right through the hall. One step at a time a building is scanned, its sign lights,
// and a pulse runs between it and City Hall (in for survey, assessment and payment; out for the bill,
// the receipt and the ledger entry). Finished steps stay lit; after the ledger the cycle resets.
// Six lights on City Hall's steps track progress. Stars, a far skyline, aircraft beacons, a waving
// flag and cars keep the city alive. Every frame is a pure function of elapsed time.
//
// mountSkyline(svg) builds the scene into an <svg viewBox="-60 -82 920 552"> and returns a cleanup.

const NS = 'http://www.w3.org/2000/svg'
const G = 432 // ground line
const HALL_X = 400
const HALL_Y = 342 // where pulses meet the dome
const INTRO = 2.2
const GAP = 2.2
const CYCLE = 16.4
const STILL = INTRO + 0.3 + 3 * GAP + 1.8 // reduced motion: mid-cycle, payment just landed

const linear = (x) => x
const quadInOut = (x) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2)
const cubicOut = (x) => 1 - (1 - x) ** 3
const cubicInOut = (x) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2)
const quartOut = (x) => 1 - (1 - x) ** 4
const backOut = (x) => 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2
const clamp = (x) => Math.min(1, Math.max(0, x))
const ramp = (t, start, dur, ease = linear) => ease(clamp((t - start) / dur))
// Rises over `inDur`, holds, then falls from `offAt` over `outDur`.
const pulse = (t, at, inDur, offAt, outDur) => ramp(t, at, inDur, cubicOut) * (1 - ramp(t, offAt, outDur, cubicInOut))
const lerp = (a, b, p) => a + (b - a) * p
const between = (p) => p > 0 && p < 1
const edgeFade = (p, k = 8) => (between(p) ? Math.min(1, p * k, (1 - p) * k) : 0)
const f2 = (n) => n.toFixed(2)
const f3 = (n) => n.toFixed(3)
// A slow on/off for ambient lights: mostly off, with a soft fade either side of each "on" spell.
const flicker = (t, period, phase) => clamp((Math.sin(2 * Math.PI * (t / period + phase)) - 0.35) * 2.5)
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
function mix(a, b, p) {
  const A = hex(a), B = hex(b)
  return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], p))).join(',')})`
}
// Seeded, so the distant skyline and window timing are the same on every visit.
function rng(seed) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag)
  for (const k in attrs) e.setAttribute(k, String(attrs[k]))
  parent.appendChild(e)
  return e
}
const set = (e, attrs) => {
  for (const k in attrs) e.setAttribute(k, String(attrs[k]))
}
function grad(defs, id, stops, attrs = { x1: 0, y1: 0, x2: 0, y2: 1 }, tag = 'linearGradient') {
  const g = el(tag, { id, ...attrs }, defs)
  stops.forEach(([o, c, op = 1]) => el('stop', { offset: o, 'stop-color': c, 'stop-opacity': op }, g))
}
function icon(parent, paths, attrs) {
  const g = el('g', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...attrs }, parent)
  paths.forEach((d) => el('path', { d }, g))
  return g
}

const ICONS = {
  survey: ['M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z', 'M14.4 10a2.4 2.4 0 1 1-4.8 0a2.4 2.4 0 1 1 4.8 0'],
  assess: ['M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z', 'M8 7.5h8', 'M8 12h.01', 'M12 12h.01', 'M16 12h.01', 'M8 16h.01', 'M12 16h.01', 'M16 16h.01'],
  bill: ['M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z', 'M14 3v5h5', 'M9 13h6', 'M9 17h4'],
  pay: ['M3 7h18v10H3z', 'M14.6 12a2.6 2.6 0 1 1-5.2 0a2.6 2.6 0 1 1 5.2 0', 'M6.5 12h.01', 'M17.5 12h.01'],
  receipt: ['M5 3h14v18l-2.33-1.5L14.33 21 12 19.5 9.67 21l-2.34-1.5L5 21z', 'M9 8h6', 'M9 12h6', 'M9 16h3'],
  ledger: ['M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20'],
}
// The cycle, left to right: three steps before City Hall, three after.
const STEPS = [
  { label: 'Survey', icon: 'survey', inbound: true },
  { label: 'Assessment', icon: 'assess', inbound: true },
  { label: 'Demand Bill', icon: 'bill', inbound: false },
  { label: 'Payment', icon: 'pay', inbound: true, coin: true },
  { label: 'Receipt', icon: 'receipt', inbound: false },
  { label: 'Ledger', icon: 'ledger', inbound: false }, // City Hall posts the entry
]
// Four buildings each side of City Hall, spaced so the far skyline shows between them.
const BUILDINGS = [
  { x: 20, w: 56, h: 156, step: 0 },
  { x: 108, w: 46, h: 208, step: 1 },
  { x: 187, w: 70, h: 125, step: 2 },
  { x: 290, w: 42, h: 91 },
  { x: 468, w: 44, h: 109 },
  { x: 544, w: 70, h: 146, step: 3 },
  { x: 646, w: 44, h: 224, step: 4 },
  { x: 724, w: 56, h: 166, step: 5 },
]
const ROAD_Y = G + 10
const CAR_SPAN = 960 // cars run from x -80 to 880, past both edges of the view

function build(root, uid) {
  const id = (name) => `${uid}-${name}`
  const url = (name) => `url(#${id(name)})`
  const defs = el('defs', {}, root)
  // Lift the scene so the ground clears the hero's footer line (the copyright).
  const svg = el('g', { transform: 'translate(0 -62)' }, root)
  grad(defs, id('under'), [[0, '#13253b', 0.7], [1, '#13253b', 0]])
  grad(defs, id('scan'), [[0, '#60a5fa', 0], [1, '#60a5fa', 0.55]])
  grad(defs, id('ground'), [[0, '#93c5fd', 0], [0.5, '#93c5fd', 0.35], [1, '#93c5fd', 0]], { x1: 0, y1: 0, x2: 1, y2: 0 })
  grad(defs, id('glow'), [[0, '#2f73ea', 0.35], [1, '#2f73ea', 0]], { cx: 0.5, cy: 0.5, r: 0.5 }, 'radialGradient')
  grad(defs, id('dome'), [[0, '#9cc4ff'], [1, '#2f73ea']])
  const ambient = []

  // Stars: sparse and faint, only in the band above the skyline.
  const sky = el('g', { opacity: 0 }, svg)
  const sr = rng(29)
  for (let k = 0; k < 30; k++) {
    const e = el('circle', { cx: f2(-40 + sr() * 880), cy: f2(150 + sr() * 120), r: f2(0.5 + sr() * 0.7), fill: '#cfe3ff' }, sky)
    const lo = 0.12 + sr() * 0.15
    ambient.push({ e, attr: 'opacity', lo, hi: lo + 0.35, period: 3 + sr() * 5, phase: sr() })
  }
  const glow = el('ellipse', { cx: HALL_X, cy: 390, rx: 300, ry: 150, fill: url('glow'), opacity: 0.5 }, svg)

  // Two distant skylines for depth: a far, faint one, and a nearer one with a few lit windows.
  const back = el('g', { opacity: 0 }, svg)
  const silhouette = (seed, minH, varH, fill, wins) => {
    const layer = el('g', {}, back)
    const r = rng(seed)
    let d = `M-60 ${G}`
    for (let x = -60; x < 860;) {
      const w = 16 + r() * 34, h = minH + r() * varH
      d += ` L${f2(x)} ${f2(G - h)} L${f2(x + w)} ${f2(G - h)}`
      if (h > 70 && r() < wins) {
        const n = 1 + Math.floor(r() * 2)
        for (let j = 0; j < n; j++) {
          const e = el('rect', { x: f2(x + 4 + r() * (w - 10)), y: f2(G - h + 8 + r() * (h - 30)), width: 2, height: 2.6, fill: '#9cc4ff' }, layer)
          ambient.push({ e, attr: 'opacity', lo: 0, hi: 0.35 + r() * 0.25, period: 5 + r() * 9, phase: r() })
        }
      }
      x += w
    }
    layer.insertBefore(el('path', { d: d + ` L860 ${G} Z`, fill }, layer), layer.firstChild)
  }
  silhouette(47, 70, 170, '#0d1c2f', 0.25) // far
  silhouette(11, 40, 150, '#0f2035', 0.45) // near
  el('rect', { x: -60, y: G, width: 920, height: 80, fill: url('under') }, svg)
  el('rect', { x: -60, y: G, width: 920, height: 1.2, fill: url('ground') }, svg)

  // The street, with cars' lights drifting along it.
  const street = el('g', { opacity: 0 }, svg)
  el('rect', { x: -60, y: ROAD_Y + 6, width: 920, height: 0.8, fill: '#93c5fd', opacity: 0.08 }, street)
  const cars = [
    { dir: 1, speed: 42, offset: 120 },
    { dir: -1, speed: 31, offset: 380 },
    { dir: 1, speed: 27, offset: 700 },
    { dir: -1, speed: 47, offset: 60 },
  ].map((c) => {
    const g = el('g', {}, street)
    const color = c.dir > 0 ? '#fff1c7' : '#ff6b5e' // headlights heading right, tail lights heading left
    const cy = ROAD_Y + (c.dir > 0 ? 0 : 4)
    el('ellipse', { cx: 0, cy, rx: 9, ry: 2, fill: color, opacity: 0.18 }, g)
    el('circle', { cx: -2, cy, r: 1.1, fill: color }, g)
    el('circle', { cx: 2, cy, r: 1.1, fill: color }, g)
    return { ...c, g }
  })

  const wr = rng(3)
  const steps = []
  const buildings = BUILDINGS.map((spec, i) => {
    const top = G - spec.h, cx = spec.x + spec.w / 2
    const g = el('g', {}, svg)
    el('rect', { x: spec.x, y: top, width: spec.w, height: spec.h, fill: '#13253b', stroke: '#fff', 'stroke-opacity': 0.13 }, g)
    let beacon
    if (spec.h > 140) {
      el('line', { x1: cx, y1: top, x2: cx, y2: top - 16, stroke: '#93c5fd', 'stroke-opacity': 0.5 }, g)
      beacon = { e: el('circle', { cx, cy: top - 17, r: 1.8, fill: '#ff5a52', opacity: 0 }, g), phase: wr() }
    }
    const wins = []
    const win = (x, y, w, h) => wins.push({ e: el('rect', { x, y, width: w, height: h, fill: '#1b3350' }, g), d: wr() * 0.55 })
    const cols = Math.floor((spec.w - 10) / 11), rows = Math.floor((spec.h - 16) / 14)
    const ox = spec.x + (spec.w - (cols * 11 - 6)) / 2
    for (let row = 0; row < rows; row++)
      for (let c = 0; c < cols; c++) win(ox + c * 11, top + 9 + row * 14, 5, 7)
    const b = { ...spec, top, cx, g, wins, beacon }
    if (spec.step === undefined) {
      // Filler buildings are lived in: about one window in six comes on and off by itself.
      wins.forEach((w) => {
        if (wr() < 0.17) ambient.push({ e: w.e, attr: 'fill', lo: 0, hi: 0.55 + wr() * 0.3, period: 6 + wr() * 10, phase: wr() })
      })
      return b
    }
    const lit = el('rect', { x: spec.x, y: top, width: spec.w, height: spec.h, fill: '#2f73ea', 'fill-opacity': 0.1, stroke: '#5aa2ff', 'stroke-width': 1.2, opacity: 0 }, g)
    const clip = el('clipPath', { id: id(`clip-${i}`) }, defs)
    el('rect', { x: spec.x, y: top, width: spec.w, height: spec.h }, clip)
    const scan = el('g', { 'clip-path': url(`clip-${i}`), opacity: 0 }, g)
    const band = el('rect', { x: spec.x, y: top, width: spec.w, height: 22, fill: url('scan') }, scan)
    const line = el('rect', { x: spec.x, y: top, width: spec.w, height: 1.6, fill: '#cfe3ff' }, scan)
    steps.push({ ...b, ...STEPS[spec.step], step: spec.step, ty: top - 26, lit, scan, band, line })
    return b
  })

  // City Hall, the hub.
  const hall = el('g', {}, svg)
  el('rect', { x: 330, y: 426, width: 140, height: 6, fill: '#1a3354' }, hall)
  el('rect', { x: 344, y: 374, width: 112, height: 52, fill: '#162c48', stroke: '#5aa2ff', 'stroke-opacity': 0.35 }, hall)
  // The frieze inscription: muted stone tone over a faint shadow, so it reads as cut into the façade.
  const inscription = { x: HALL_X, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 8, 'font-weight': 700, 'letter-spacing': 0.8, textLength: 96, lengthAdjust: 'spacingAndGlyphs' }
  el('text', { ...inscription, y: 383.2, fill: '#0a1626', opacity: 0.9 }, hall).textContent = 'CITY CORPORATION'
  el('text', { ...inscription, y: 382.5, fill: '#7d9cc2' }, hall).textContent = 'CITY CORPORATION'
  const columns = Array.from({ length: 6 }, (_, k) => el('line', { x1: 356 + k * 17.6, y1: 391, x2: 356 + k * 17.6, y2: 420, stroke: '#93c5fd', 'stroke-opacity': 0.55, 'stroke-width': 3 }, hall))
  el('rect', { x: 338, y: 366, width: 124, height: 8, fill: '#1e3a5f', stroke: '#5aa2ff', 'stroke-opacity': 0.4 }, hall)
  el('rect', { x: 378, y: 352, width: 44, height: 14, fill: '#1a3354', stroke: '#5aa2ff', 'stroke-opacity': 0.4 }, hall)
  el('path', { d: 'M374 352 A26 26 0 0 1 426 352 Z', fill: url('dome') }, hall)
  const domeFlash = el('path', { d: 'M374 352 A26 26 0 0 1 426 352 Z', fill: '#e0edff', opacity: 0 }, hall)
  el('line', { x1: HALL_X, y1: 326, x2: HALL_X, y2: 306, stroke: '#93c5fd', 'stroke-width': 1.5 }, hall)
  const flag = el('path', { d: 'M400 306 h12 l-3 3.5 l3 3.5 h-12 Z', fill: '#60a5fa' }, hall)
  // Ripples spread behind City Hall, so they never sweep across its front or the inscription.
  const ripples = [0, 1].map(() => svg.insertBefore(el('ellipse', { cx: HALL_X, cy: 340, rx: 32, ry: 32, fill: 'none', stroke: '#60a5fa', 'stroke-width': 1.5, opacity: 0 }, svg), hall))

  steps.sort((a, b) => a.step - b.step).forEach((b) => {
    b.tag = el('g', { opacity: 0 }, svg)
    b.ptr = el('path', { d: 'M-5 11 L0 16 L5 11 Z', fill: '#5aa2ff' }, b.tag)
    b.box = el('rect', { y: -12, height: 24, rx: 5, fill: '#0f2a4a', stroke: '#2a4a72' }, b.tag)
    b.hot = el('rect', { y: -12, height: 24, rx: 5, fill: '#13355e', stroke: '#5aa2ff', opacity: 1 }, b.tag)
    b.glyph = icon(b.tag, ICONS[b.icon], { stroke: '#dcecfd', 'stroke-width': 2 })
    b.text = el('text', { y: 0.5, 'dominant-baseline': 'central', 'font-size': 11.5, 'font-weight': 600, fill: '#ffffff' }, b.tag)
    b.text.textContent = b.label
    // The arc a pulse travels, drawn in its direction of travel, so a dash along it reads as a trail.
    const ax = b.cx, ay = b.ty + 16, cx1 = (ax + HALL_X) / 2, cy1 = Math.min(ay, 300) - 70
    const arc = b.inbound ? `M${ax} ${ay} Q${cx1} ${cy1} ${HALL_X} ${HALL_Y}` : `M${HALL_X} ${HALL_Y} Q${cx1} ${cy1} ${ax} ${ay}`
    b.trail = el('path', { d: arc, pathLength: 1, fill: 'none', stroke: b.coin ? '#fbbf24' : '#7db7ff', 'stroke-width': 1.6, 'stroke-linecap': 'round', opacity: 0 }, svg)
    // One progress light per step on City Hall's plinth, in cycle order.
    b.progress = el('circle', { cx: f2(HALL_X + (b.step - 2.5) * 12), cy: 429, r: 1.5, fill: '#2a4a72' }, hall)
    b.dot = el('g', { opacity: 0 }, svg)
    if (b.coin) {
      el('circle', { r: 9, fill: '#fbbf24', opacity: 0.25 }, b.dot)
      el('circle', { r: 4.2, fill: '#fcd34d' }, b.dot)
    } else {
      el('circle', { r: 8, fill: '#7db7ff', opacity: 0.22 }, b.dot)
      el('circle', { r: 3.2, fill: '#e6f0ff' }, b.dot)
    }
  })
  return { sky, back, glow, hall, columns, flag, domeFlash, ripples, buildings, steps, ambient, street, cars }
}

// Sizes each sign to its label's real width, once the font is in.
function measure(s) {
  s.steps.forEach((b) => {
    let tw = 0
    try { tw = b.text.getComputedTextLength() } catch { tw = b.label.length * 6.4 }
    const w = 10 + 14 + 6 + tw + 11, x = -w / 2
    set(b.box, { x, width: w })
    set(b.hot, { x, width: w })
    set(b.glyph, { transform: `translate(${f2(x + 10)} -7) scale(${f2(14 / 24)})` })
    set(b.text, { x: f2(x + 30) })
  })
}

function paint(s, t) {
  const rise = (delay) => ramp(t, delay, 0.8, quartOut)
  const hr = rise(0.1)
  set(s.hall, { transform: `translate(0 ${G}) scale(1 ${f2(0.2 + 0.8 * hr)}) translate(0 ${-G})`, opacity: f2(hr) })
  set(s.back, { opacity: f2(ramp(t, 0, 1)) })
  set(s.sky, { opacity: f2(ramp(t, 0.4, 1.6)) })
  set(s.street, { opacity: f2(ramp(t, 1.2, 1)) })
  s.ambient.forEach((a) => {
    const v = lerp(a.lo, a.hi, flicker(t, a.period, a.phase))
    if (a.attr === 'fill') set(a.e, { fill: mix('#1b3350', '#bcd7ff', v) })
    else set(a.e, { opacity: f3(v) })
  })
  s.cars.forEach((c) => {
    const run = (t * c.speed + c.offset) % CAR_SPAN
    set(c.g, { transform: `translate(${f2(c.dir > 0 ? -80 + run : 880 - run)} 0)` })
  })
  // The flag ripples about its pole.
  set(s.flag, { transform: `translate(${HALL_X} 309.5) skewY(${f2(5 * Math.sin(t * 2.6))}) scale(${f2(1 - 0.06 * (0.5 + 0.5 * Math.sin(t * 3.1)))} 1) translate(${-HALL_X} -309.5)` })

  const lt = t - INTRO
  const cyc = lt < 0 ? -1 : lt % CYCLE
  const reset = 1 - ramp(cyc, CYCLE - 1.3, 0.9, cubicInOut)
  let hit = 0
  const rip = [0, 0]
  s.buildings.forEach((b) => {
    const r = rise(0.3 + (Math.abs(b.cx - HALL_X) / 400) * 0.9)
    set(b.g, { transform: `translate(0 ${G}) scale(1 ${f2(0.15 + 0.85 * r)}) translate(0 ${-G})`, opacity: f2(r) })
    // A short sharp blink every 1.8 s.
    if (b.beacon)
      set(b.beacon.e, { opacity: f3(ramp(t, 1.5, 0.5) * (0.15 + 0.85 * Math.max(0, Math.sin(2 * Math.PI * (t / 1.8 + b.beacon.phase))) ** 12)) })
  })
  s.steps.forEach((b) => {
    const start = 0.3 + b.step * GAP, done = start + 1.6
    // Scan down the building.
    const sp = ramp(cyc, start, 0.8, quadInOut)
    const yy = b.top + sp * b.h
    set(b.scan, { opacity: f2(edgeFade(sp)) })
    set(b.band, { y: f2(yy - 22) })
    set(b.line, { y: f2(yy) })
    // Sign: only the current step has one.
    const tin = ramp(cyc, start, 0.4, backOut), tout = ramp(cyc, start + GAP - 0.6, 0.3, cubicInOut)
    const show = clamp(tin) * (1 - tout)
    set(b.tag, { opacity: f2(show), transform: `translate(${b.cx} ${f2(b.ty + 6 * (1 - tin) - 4 * tout)}) scale(${f2(Math.max(0.01, tin * (1 - 0.25 * tout)))})` })
    // Pulse between the building and City Hall, along an arc.
    const pp = ramp(cyc, start + 0.8, 0.8, quadInOut)
    if (between(pp)) {
      const p = b.inbound ? pp : 1 - pp
      const x0 = b.cx, y0 = b.ty + 16, x1 = (x0 + HALL_X) / 2, y1 = Math.min(y0, 300) - 70
      const u = 1 - p
      const fade = Math.min(1, pp * 8, (1 - pp) * 12)
      set(b.dot, {
        opacity: f2(fade),
        transform: `translate(${f2(u * u * x0 + 2 * u * p * x1 + p * p * HALL_X)} ${f2(u * u * y0 + 2 * u * p * y1 + p * p * HALL_Y)})`,
      })
      // A comet tail: the last stretch of the arc behind the pulse.
      const tail = Math.max(0, pp - 0.28)
      set(b.trail, { 'stroke-dasharray': `${f3(pp - tail)} 2`, 'stroke-dashoffset': f3(-tail), opacity: f2(0.55 * fade) })
    } else {
      set(b.dot, { opacity: 0 })
      set(b.trail, { opacity: 0 })
    }
    // The hall flashes when a pulse lands, or as it sends one out.
    const ht = b.inbound ? done : start + 0.8
    hit = Math.max(hit, pulse(cyc, ht, 0.08, ht + 0.1, 0.6))
    const rp = ramp(cyc, ht, 1.1, cubicOut)
    if (between(rp)) rip[b.step % 2] = rp
    // Done: the building lights, window by window.
    const lit = ramp(cyc, done, 0.7, cubicOut) * reset
    set(b.lit, { opacity: f2(Math.max(lit, edgeFade(sp, 4) * 0.7)) })
    b.wins.forEach((w) => set(w.e, { fill: mix('#1b3350', '#bcd7ff', ramp(cyc, done + w.d, 0.25) * reset) }))
    // Progress light: breathes while this step runs, stays on once it is done.
    const running = between(clamp((cyc - start) / 1.6)) ? 0.35 + 0.35 * Math.sin(cyc * 9) : 0
    set(b.progress, { fill: mix('#2a4a72', '#cfe3ff', Math.max(lit, running)) })
  })
  s.columns.forEach((c) => set(c, { 'stroke-opacity': f2(0.55 + 0.45 * hit) }))
  set(s.domeFlash, { opacity: f2(0.7 * hit) })
  set(s.glow, { opacity: f2(0.5 + 0.5 * hit) })
  s.ripples.forEach((e, j) => {
    const p = rip[j]
    set(e, { transform: `translate(400 340) scale(${f2(1 + 1.4 * p)}) translate(-400 -340)`, opacity: between(p) ? f2(0.8 * (1 - p)) : 0 })
  })
}

let mounts = 0
export function mountSkyline(svg) {
  const scene = build(svg, `sky${++mounts}`)
  let alive = true
  let raf = 0
  measure(scene)
  if (document.fonts) document.fonts.ready.then(() => alive && measure(scene))
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    paint(scene, STILL)
  } else {
    const start = performance.now()
    const tick = (now) => {
      if (!alive) return
      paint(scene, (now - start) / 1000)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  }
  return () => {
    alive = false
    cancelAnimationFrame(raf)
    while (svg.firstChild) svg.removeChild(svg.firstChild)
  }
}
