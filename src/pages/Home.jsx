import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Building2, Users, Landmark, Wallet, PieChart as PieIcon, Grid3x3, ListOrdered, ChevronRight, BarChart3, CalendarRange, ClipboardCheck,
} from 'lucide-react'
import { useData } from '../data/store.jsx'
import { OPEN_BILL, billDue, fiscalYearOf, fiscalYears, money, quarterRange, totalRate } from '../data/tax.js'
import { BarChart, PieChart, SERIES } from '../components/charts.jsx'
import { Select } from '../components/ui.jsx'

const num = (n) => (Number(n) || 0).toLocaleString('en-IN')
const short = (n) => (n >= 1e7 ? (n / 1e7).toFixed(2) + ' Cr' : n >= 1e5 ? (n / 1e5).toFixed(2) + ' L' : num(Math.round(n)))
const asOf = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const BLUES = ['#1e3a8a', '#1d4ed8', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe']
const MONTHS = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']

function Card({ icon: Icon, title, right, children, footer, className = '' }) {
  return (
    <section className={`card ${className}`}>
      <header className="card-head">
        <h3><Icon size={17} strokeWidth={1.8} /> {title}</h3>
        <span className="muted small">{right ?? `As of ${asOf}`}</span>
      </header>
      <div className="card-body">{children}</div>
      {footer && <footer className="card-foot">{footer}</footer>}
    </section>
  )
}

function Kpi({ icon: Icon, label, value, unit, to }) {
  const inner = (
    <>
      <span className="kpi-icon"><Icon size={18} strokeWidth={1.8} /></span>
      <div>
        <div className="kpi-value">{value}{unit && <small> {unit}</small>}</div>
        <div className="kpi-label">{label}</div>
      </div>
    </>
  )
  return to ? <Link to={to} className="card kpi">{inner}</Link> : <div className="card kpi">{inner}</div>
}

function Donut({ parts }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1
  let acc = 0
  const r = 52
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 140 140" className="donut" role="img" aria-label="Holdings by property use">
      {parts.map((p, i) => {
        const len = (p.value / total) * c
        const el = (
          <circle key={p.label} cx="70" cy="70" r={r} fill="none" stroke={BLUES[i % BLUES.length]} strokeWidth="26"
            strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-acc} transform="rotate(-90 70 70)" />
        )
        acc += len
        return el
      })}
    </svg>
  )
}

export default function Home() {
  const { db } = useData()
  const navigate = useNavigate()
  const [fy, setFy] = useState(fiscalYearOf())
  const taxpayers = db.geo_holding_taxpayer.filter((t) => t.xstatus === 'Active')
  const wards = db.geo_ward
  const roads = db.geo_road
  const received = db.geo_holding_collection.filter((c) => c.xstatus === 'Received')
  const fyRange = { start: quarterRange(fy, 1).start, end: quarterRange(fy, 4).end }
  const fyReceipts = received.filter((c) => c.xdate >= fyRange.start && c.xdate <= fyRange.end)
  const annualDemand = taxpayers.reduce((s, t) => s + t.xannual_value, 0)
  const collected = fyReceipts.reduce((s, c) => s + c.xtotal, 0)
  const open = db.geo_holding_bill.filter((b) => OPEN_BILL.includes(b.xstatus))
  const outstanding = open.reduce((s, b) => s + billDue(b), 0)
  const ratio = collected + outstanding > 0 ? Math.round((collected / (collected + outstanding)) * 100) : null

  // Quarterly receivable = that quarter's tax demand on active holdings; collection = cash received in the quarter.
  const rate = totalRate(db) / 100
  const quarterDemand = Math.round(taxpayers.reduce((s, t) => s + (t.xannual_value * rate) / 4, 0))
  const quarters = [1, 2, 3, 4].map((q) => {
    const { start, end } = quarterRange(fy, q)
    return { q, start, end, receivable: quarterDemand, collection: Math.round(received.filter((c) => c.xdate >= start && c.xdate <= end).reduce((s, c) => s + c.xtotal, 0)) }
  })
  const monthly = MONTHS.map((m, i) => {
    const y = Number(fy.slice(0, 4)) + (i >= 6 ? 1 : 0)
    const key = `${y}-${String(((i + 6) % 12) + 1).padStart(2, '0')}`
    const rows = received.filter((c) => c.xdate.startsWith(key))
    return { label: m, value: Math.round(rows.reduce((s, c) => s + c.xtotal, 0)), count: rows.length }
  })
  const pending = {
    surveys: db.geo_survey.filter((s) => s.xstatus === 'Submitted').length,
    assessments: db.geo_assessment.filter((a) => a.xstatus === 'Draft').length,
    transfers: db.geo_ownership_transfer.filter((t) => t.xstatus === 'Pending').length,
  }

  const uses = Object.entries(taxpayers.reduce((m, t) => ({ ...m, [t.xpropuse]: (m[t.xpropuse] || 0) + 1 }), {}))
    .sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }))
  const types = [...new Set(taxpayers.map((t) => t.xproptype))]
  const matrix = wards.map((w) => {
    const tp = taxpayers.filter((t) => t.xwardid === w.xwardid)
    return {
      ...w,
      cells: types.map((ty) => tp.filter((t) => t.xproptype === ty).reduce((s, t) => s + t.xannual_value, 0)),
      total: tp.reduce((s, t) => s + t.xannual_value, 0),
      count: tp.length,
    }
  })
  const maxCell = Math.max(1, ...matrix.flatMap((m) => m.cells))
  const shade = (v) => (v ? ['#dbeafe', '#bfdbfe', '#93c5fd', '#3b82f6', '#1e3a8a'][Math.min(4, Math.floor((v / maxCell) * 5))] : null)
  const top = open.map((b) => ({ ...b, _tp: db.geo_holding_taxpayer.find((t) => t.xtaxcode === b.xtaxcode), _due: billDue(b) }))
    .sort((a, b) => b._due - a._due).slice(0, 6)
  const qTotal = quarters.reduce((s, q) => ({ r: s.r + q.receivable, c: s.c + q.collection }), { r: 0, c: 0 })
  const bestMonth = monthly.reduce((m, x) => (x.value > m.value ? x : m), monthly[0])

  return (
    <div className="page">
      <div className="dash-filters">
        <h1>Dashboard</h1>
        <label className="date-filter"><CalendarRange size={15} /> Fiscal year
          <Select value={fy} onChange={setFy} options={fiscalYears(fiscalYearOf(), 2, 0)} aria-label="Fiscal year" />
        </label>
      </div>

      <div className="kpi-grid">
        <Kpi icon={Building2} label="Buildings registered" value={num(db.geo_building.length)} to="/buildings" />
        <Kpi icon={Users} label="Active holdings" value={num(taxpayers.length)} to="/taxpayers" />
        <Kpi icon={Landmark} label="Total annual valuation" value={short(annualDemand)} unit="BDT" />
        <Kpi icon={Wallet} label={`Collected · FY ${fy}`} value={short(collected)} unit="BDT" to="/collections" />
      </div>

      <div className="grid-2-1">
        <Card icon={BarChart3} title="Quarterly Receivable vs Collection" right={`FY ${fy}`}
          footer={<><span>Receivable {money(qTotal.r)} · Collected {money(qTotal.c)} BDT</span><Link to="/bills" className="link">Bills <ChevronRight size={14} /></Link></>}>
          <BarChart
            ariaLabel={`Receivable and collection by quarter, FY ${fy}`}
            categories={quarters.map((q) => `Q${q.q}`)}
            series={[
              { label: 'Receivable', color: SERIES.receivable, values: quarters.map((q) => q.receivable) },
              { label: 'Collection', color: SERIES.collection, values: quarters.map((q) => q.collection) },
            ]}
            note={(i) => <div className="muted">{quarters[i].start} – {quarters[i].end}{quarters[i].collection > quarters[i].receivable ? ' · includes advance payments' : ''}</div>}
          />
        </Card>

        <Card icon={PieIcon} title="Receivable vs Collection" right={ratio === null ? `FY ${fy}` : `${ratio}% collected`}
          footer={<><span><strong>{open.length}</strong> open bills</span><Link to="/bills?status=Issued" className="link">Open bills <ChevronRight size={14} /></Link></>}>
          <PieChart
            ariaLabel="Receivable split into collected and outstanding"
            parts={[
              { label: 'Collected', color: SERIES.collection, value: Math.round(collected) },
              { label: 'Outstanding', color: SERIES.receivable, value: Math.round(outstanding) },
            ]}
          />
        </Card>
      </div>

      <div className="grid-2-1">
        <Card icon={BarChart3} title="Monthly Collection" right={`FY ${fy} · BDT`}
          footer={<><span>{fyReceipts.length} receipts{bestMonth.value ? ` · best month ${bestMonth.label} (${money(bestMonth.value)})` : ''}</span><Link to="/collections" className="link">Collections <ChevronRight size={14} /></Link></>}>
          <BarChart
            ariaLabel={`Collections by month, FY ${fy}`} height={200}
            categories={monthly.map((m) => m.label)}
            series={[{ label: 'Collection', color: SERIES.collection, values: monthly.map((m) => m.value) }]}
            note={(i) => <div className="muted">{monthly[i].count} receipts</div>}
          />
        </Card>

        <Card icon={ClipboardCheck} title="Awaiting Action" right="Holdings workflow">
          <ul className="todo-list">
            <li><Link to="/survey"><span>Surveys to verify</span><strong>{pending.surveys}</strong></Link></li>
            <li><Link to="/assessment"><span>Draft assessments to approve</span><strong>{pending.assessments}</strong></Link></li>
            <li><Link to="/transfer"><span>Ownership transfers pending</span><strong>{pending.transfers}</strong></Link></li>
            <li><Link to="/bills?status=Issued"><span>Bills awaiting payment</span><strong>{open.length}</strong></Link></li>
          </ul>
          <h4 className="mini-title">Holdings by use</h4>
          <div className="donut-wrap compact">
            <Donut parts={uses} />
            <ul className="legend-list">
              {uses.map((u, i) => (
                <li key={u.label}><i style={{ background: BLUES[i % BLUES.length] }} /><span className="bn">{u.label}</span><strong>{u.value}</strong><span className="muted">{Math.round((u.value / taxpayers.length) * 100)}%</span></li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      <div className="grid-2">
        <Card icon={Grid3x3} title="Annual Valuation by Ward"
          footer={<><span><strong>{wards.length}</strong> wards · <strong>{roads.length}</strong> roads</span>
            <span className="legend">Less {['#dbeafe', '#bfdbfe', '#93c5fd', '#3b82f6', '#1e3a8a'].map((c) => <i key={c} style={{ background: c }} />)} More</span></>}>
          <div className="table-wrap">
            <table className="heat">
              <thead>
                <tr><th>Ward</th>{types.map((t, i) => <th key={t} className="bn"><i style={{ background: BLUES[i] }} />{t}</th>)}<th className="num">Total</th></tr>
              </thead>
              <tbody>
                {matrix.map((m) => (
                  <tr key={m.xwardid}>
                    <td>{m.xwardname}</td>
                    {m.cells.map((v, i) => {
                      const bg = shade(v)
                      return <td key={i} className="cell"><span style={bg ? { background: bg, color: bg === '#3b82f6' || bg === '#1e3a8a' ? '#fff' : '#1e3a8a' } : undefined}>{v ? short(v) : '·'}</span></td>
                    })}
                    <td className="num strong">{short(m.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card icon={ListOrdered} title="Largest Outstanding Dues"
          footer={<><span>{money(outstanding)} BDT due in total</span><Link to="/bills?status=Issued" className="link">Open bills <ChevronRight size={14} /></Link></>}>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Owner</th><th>Period</th><th className="num">Arrear</th><th className="num">Total due</th></tr></thead>
              <tbody>
                {top.map((b) => (
                  <tr key={b.xbillno} className="clickable" onClick={() => navigate(`/bills/${b.xbillno}`)}>
                    <td>{b._tp?.xowner}<div className="muted small mono">{b.xbillno}</div></td>
                    <td>{b.xfyear} Q{b.xquarter}</td>
                    <td className="num">{money(b.xarrear + b.xsurcharge)}</td>
                    <td className="num strong">{money(b._due)}</td>
                  </tr>
                ))}
                {!top.length && <tr><td colSpan={4} className="muted">No outstanding dues.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
