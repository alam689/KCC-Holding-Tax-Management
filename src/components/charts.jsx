import { useEffect, useRef, useState } from 'react'

// Two-series palette validated for colour-blind separation (ΔE 24.7 protan) and contrast on white.
export const SERIES = { receivable: '#eb6834', collection: '#2a78d6' }

const niceMax = (v) => {
  if (v <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(v))
  const n = v / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p
}
const compact = (n) => (n >= 1e7 ? `${+(n / 1e7).toFixed(1)}Cr` : n >= 1e5 ? `${+(n / 1e5).toFixed(1)}L` : n >= 1e3 ? `${+(n / 1e3).toFixed(1)}k` : `${Math.round(n)}`)
const fmt = (n) => (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })

function useTip() {
  const ref = useRef(null)
  const [tip, setTip] = useState(null)
  const show = (e, content) => {
    const r = ref.current.getBoundingClientRect()
    setTip({ x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, content })
  }
  const el = tip && (
    <div className="chart-tip" style={{ left: Math.min(tip.x + 12, tip.w - 190), top: Math.max(tip.y - 12, 0) }}>{tip.content}</div>
  )
  return { ref, show, hide: () => setTip(null), el }
}

export function Legend({ items }) {
  return (
    <div className="chart-legend">
      {items.map((i) => <span key={i.label}><i style={{ background: i.color }} />{i.label}</span>)}
    </div>
  )
}

// Vertical bars, one or more series per category, single y-axis from zero.
export function BarChart({ categories, series, height = 220, ariaLabel, note }) {
  const tip = useTip()
  const [W, setW] = useState(640)
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))))
    ro.observe(tip.ref.current)
    return () => ro.disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const H = height, L = 44, R = 8, T = 10, B = 26
  const max = niceMax(Math.max(...series.flatMap((s) => s.values), 0))
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max)
  const cw = (W - L - R) / categories.length
  const gap = 2
  const groupW = Math.min(cw * 0.7, series.length * 34)
  const bw = (groupW - gap * (series.length - 1)) / series.length
  const y = (v) => T + (H - T - B) * (1 - v / max)
  const bar = (x, v, w) => {
    const top = y(v), base = y(0), h = base - top
    if (h <= 0) return null
    const r = Math.min(4, h, w / 2)
    return `M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${base} Z`
  }
  return (
    <div className="chart" ref={tip.ref} onMouseLeave={tip.hide}>
      {series.length > 1 && <Legend items={series} />}
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={ariaLabel}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className={t === 0 ? 'axis' : 'grid'} />
            <text x={L - 6} y={y(t)} className="tick" textAnchor="end" dominantBaseline="central">{compact(t)}</text>
          </g>
        ))}
        {categories.map((c, i) => {
          const gx = L + cw * i + (cw - groupW) / 2
          return (
            <g key={c}>
              <rect x={L + cw * i} y={T} width={cw} height={H - T - B} className="hit"
                onMouseMove={(e) => tip.show(e, <>
                  <strong>{c}</strong>
                  {series.map((s) => <div key={s.label}><i style={{ background: s.color }} />{s.label}<b>{fmt(s.values[i])}</b></div>)}
                  {note?.(i)}
                </>)} />
              {series.map((s, k) => {
                const d = bar(gx + k * (bw + gap), s.values[i], bw)
                return d && <path key={s.label} d={d} fill={s.color} pointerEvents="none" />
              })}
              <text x={L + cw * i + cw / 2} y={H - 8} className="tick" textAnchor="middle">{c}</text>
            </g>
          )
        })}
      </svg>
      {tip.el}
    </div>
  )
}

// Pie for a two-part whole; 2px surface gap between slices, values and shares in the legend.
export function PieChart({ parts, size = 180, ariaLabel }) {
  const tip = useTip()
  const total = parts.reduce((s, p) => s + p.value, 0)
  const c = size / 2, r = size / 2 - 2
  let a0 = -Math.PI / 2
  const slices = parts.map((p) => {
    const a = total ? (p.value / total) * Math.PI * 2 : 0
    const a1 = a0 + a
    const large = a > Math.PI ? 1 : 0
    const path = a >= Math.PI * 2 - 1e-6
      ? `M${c},${c - r} A${r},${r} 0 1 1 ${c - 0.01},${c - r} Z`
      : `M${c},${c} L${c + r * Math.cos(a0)},${c + r * Math.sin(a0)} A${r},${r} 0 ${large} 1 ${c + r * Math.cos(a1)},${c + r * Math.sin(a1)} Z`
    const mid = (a0 + a1) / 2
    a0 = a1
    return { ...p, path, share: total ? p.value / total : 0, mid }
  })
  return (
    <div className="pie-wrap" ref={tip.ref} onMouseLeave={tip.hide}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={ariaLabel}>
        {total === 0 && <circle cx={c} cy={c} r={r} fill="#eef2f7" />}
        {slices.filter((s) => s.value > 0).map((s) => (
          <path key={s.label} d={s.path} fill={s.color} stroke="#fff" strokeWidth="2" strokeLinejoin="round"
            onMouseMove={(e) => tip.show(e, <><strong>{s.label}</strong><div><b>{fmt(s.value)} BDT</b></div><div>{Math.round(s.share * 100)}% of receivable</div></>)} />
        ))}
        {slices.filter((s) => s.share >= 0.08).map((s) => (
          <text key={s.label + 't'} x={c + r * 0.58 * Math.cos(s.mid)} y={c + r * 0.58 * Math.sin(s.mid)} className="pie-label" textAnchor="middle" dominantBaseline="central">
            {Math.round(s.share * 100)}%
          </text>
        ))}
      </svg>
      <ul className="legend-list">
        {slices.map((s) => (
          <li key={s.label}>
            <i style={{ background: s.color }} />
            <span>{s.label}</span>
            <strong>{fmt(s.value)}</strong>
            <span className="muted">{Math.round(s.share * 100)}%</span>
          </li>
        ))}
        <li className="legend-total"><i /><span>Total receivable</span><strong>{fmt(total)}</strong><span className="muted">BDT</span></li>
      </ul>
      {tip.el}
    </div>
  )
}
