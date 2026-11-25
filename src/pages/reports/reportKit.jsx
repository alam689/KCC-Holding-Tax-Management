import { Download, Printer, CalendarRange } from 'lucide-react'
import { Field, Select } from '../../components/ui.jsx'
import Emblem from '../../components/Emblem.jsx'
import { fmtDate, fmtTs, nowTs, today } from '../../data/tax.js'

// Joined collection rows: receipt + bill + taxpayer + ward, for reporting.
export function collectionRows(db) {
  return db.geo_holding_collection.map((c) => {
    const b = db.geo_holding_bill.find((x) => x.xbillno === c.xbillno)
    const t = b && db.geo_holding_taxpayer.find((x) => x.xtaxcode === b.xtaxcode)
    const w = t && db.geo_ward.find((x) => x.xwardid === t.xwardid)
    return {
      ...c, xtaxcode: b?.xtaxcode ?? '', xowner: t?.xowner ?? '', xwardid: t?.xwardid ?? null, xwardname: w?.xwardname ?? '—',
      xfyear: b?.xfyear ?? '', xquarter: b?.xquarter ?? null,
    }
  })
}

const monthStart = () => today().slice(0, 8) + '01'
export const defaultFilters = () => ({ from: monthStart(), to: today(), ward: '', mode: '', user: '', status: 'Received' })

export function applyFilters(rows, f) {
  return rows.filter((r) => (!f.from || r.xdate >= f.from) && (!f.to || r.xdate <= f.to)
    && (!f.ward || r.xwardid === Number(f.ward)) && (!f.mode || r.xpaymode === f.mode)
    && (!f.user || r.zemail === f.user) && (!f.status || r.xstatus === f.status))
}

const PRESETS = [
  ['today', 'Today'], ['month', 'This month'], ['lastmonth', 'Last month'], ['quarter', 'This quarter'], ['fy', 'This fiscal year'],
]
function presetRange(key) {
  const d = new Date()
  const iso = (x) => new Date(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate())).toISOString().slice(0, 10)
  const y = d.getFullYear(), m = d.getMonth()
  if (key === 'today') return { from: today(), to: today() }
  if (key === 'month') return { from: iso(new Date(y, m, 1)), to: today() }
  if (key === 'lastmonth') return { from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) }
  if (key === 'quarter') { const qs = m - (((m - 6) % 3) + 3) % 3; return { from: iso(new Date(y, qs, 1)), to: today() } }
  const fyStart = m >= 6 ? new Date(y, 6, 1) : new Date(y - 1, 6, 1)
  return { from: iso(fyStart), to: today() }
}

export function ReportFilters({ db, f, setF, children }) {
  const set = (p) => setF((x) => ({ ...x, ...p }))
  const bad = f.from && f.to && f.from > f.to
  return (
    <section className="card no-print report-filters">
      <div className="card-body">
        <div className="preset-row">
          <CalendarRange size={15} />
          {PRESETS.map(([k, l]) => <button key={k} type="button" className="chip" onClick={() => set(presetRange(k))}>{l}</button>)}
        </div>
        <div className="form-grid form-grid-4">
          <Field label="From date" required error={bad ? 'From must be on or before To' : null}><input className="input" type="date" value={f.from} max={f.to || undefined} onChange={(e) => set({ from: e.target.value })} /></Field>
          <Field label="To date" required><input className="input" type="date" value={f.to} min={f.from || undefined} onChange={(e) => set({ to: e.target.value })} /></Field>
          <Field label="Ward"><Select value={f.ward} onChange={(v) => set({ ward: v })} options={db.geo_ward.map((w) => [String(w.xwardid), w.xwardname])} placeholder="All wards" /></Field>
          <Field label="Payment mode"><Select value={f.mode} onChange={(v) => set({ mode: v })} options={db.xcodes.filter((c) => c.xtype === 'PayMode').map((c) => c.xcode)} placeholder="All modes" /></Field>
          <Field label="Collected by"><Select value={f.user} onChange={(v) => set({ user: v })} options={db.zxusers.map((u) => [u.zemail, u.xname])} placeholder="All users" /></Field>
          <Field label="Receipt status"><Select value={f.status} onChange={(v) => set({ status: v })} options={['Received', 'Cancelled']} placeholder="All statuses" /></Field>
          {children}
        </div>
      </div>
    </section>
  )
}

export function filterSummary(db, f) {
  const parts = [`${fmtDate(f.from)} to ${fmtDate(f.to)}`]
  if (f.ward) parts.push(db.geo_ward.find((w) => w.xwardid === Number(f.ward))?.xwardname)
  if (f.mode) parts.push(`Mode: ${f.mode}`)
  if (f.user) parts.push(`Collected by: ${db.zxusers.find((u) => u.zemail === f.user)?.xname ?? f.user}`)
  parts.push(f.status ? `Status: ${f.status}` : 'All statuses')
  return parts.join(' · ')
}

export function ReportHeader({ db, title, subtitle }) {
  return (
    <header className="doc-head">
      <Emblem size={44} />
      <div>
        <h2>{db.zbusiness[0].zorg}</h2>
        <p><strong>{title}</strong> · {subtitle}</p>
      </div>
      <div className="doc-no"><span>Generated</span><strong>{fmtTs(nowTs())}</strong></div>
    </header>
  )
}

export function ReportActions({ onCsv, disabled }) {
  return <>
    <button type="button" className="btn btn-ghost" onClick={onCsv} disabled={disabled}><Download size={16} /> Export CSV</button>
    <button type="button" className="btn btn-primary" onClick={() => window.print()} disabled={disabled}><Printer size={16} /> Print</button>
  </>
}

// CSV with a UTF-8 BOM so Excel shows Bangla text correctly.
export function downloadCsv(filename, header, rows) {
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const text = '﻿' + [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const sumBy = (rows, k) => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0)
export const AMOUNTS = [['xcurrent', 'Current'], ['xrebate', 'Rebate'], ['xarrear', 'Arrear'], ['xsurcharge', 'Surcharge'], ['xtotal', 'Total']]
