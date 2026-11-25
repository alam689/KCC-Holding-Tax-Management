import { Fragment, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../../data/store.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { Badge, Empty, Field, NoAccess, PageHeader, Select } from '../../components/ui.jsx'
import { fmtDate, money } from '../../data/tax.js'
import {
  AMOUNTS, ReportActions, ReportFilters, ReportHeader, applyFilters, collectionRows, defaultFilters, downloadCsv, filterSummary, sumBy,
} from './reportKit.jsx'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// ---------- Date-range collection report: detail (one line per receipt) ----------
export function CollectionDetailReport() {
  const { db } = useData()
  const { can } = useAuth()
  const [f, setF] = useState(defaultFilters)
  const [daily, setDaily] = useState('1')

  const rows = useMemo(() => applyFilters(collectionRows(db), f)
    .sort((a, b) => a.xdate.localeCompare(b.xdate) || a.xreceiptno.localeCompare(b.xreceiptno)), [db, f])
  const days = useMemo(() => {
    const m = new Map()
    rows.forEach((r) => m.set(r.xdate, [...(m.get(r.xdate) || []), r]))
    return [...m.entries()]
  }, [rows])

  if (!can('holding.collections.view')) return <NoAccess />
  const valid = !(f.from && f.to && f.from > f.to)
  const amountCells = (list) => AMOUNTS.map(([k]) => <td key={k} className="num">{k === 'xrebate' && sumBy(list, k) ? `−${money(sumBy(list, k))}` : money(sumBy(list, k))}</td>)

  function csv() {
    downloadCsv(`collection-detail_${f.from}_to_${f.to}.csv`,
      ['SL', 'Date', 'Receipt no', 'Bill no', 'Tax code', 'Owner', 'Ward', 'Fiscal year', 'Bill quarter', 'Paid up to', 'Mode', 'Bank', 'Reference', 'Current', 'Rebate', 'Arrear', 'Surcharge', 'Total', 'Status', 'Collected by'],
      rows.map((r, i) => [i + 1, r.xdate, r.xreceiptno, r.xbillno, r.xtaxcode, r.xowner, r.xwardname, r.xfyear, `Q${r.xquarter}`, `Q${r.xupto_quarter}`,
        r.xpaymode, r.xbank ?? '', r.xtrnref ?? '', r.xcurrent, r.xrebate, r.xarrear, r.xsurcharge, r.xtotal, r.xstatus, r.zemail]))
  }

  let sl = 0
  return (
    <div className="page">
      <PageHeader title="Collection Report — Detail" subtitle="Every receipt in the date range, with daily subtotals."
        actions={<ReportActions onCsv={csv} disabled={!rows.length || !valid} />} />
      <ReportFilters db={db} f={f} setF={setF}>
        <Field label="Daily subtotals"><Select value={daily} onChange={setDaily} options={[['1', 'Show'], ['0', 'Hide']]} /></Field>
      </ReportFilters>

      <section className="card doc report">
        <ReportHeader db={db} title="Collection Report — Detail" subtitle={filterSummary(db, f)} />
        {!valid ? <Empty title="Check the date range">The From date must be on or before the To date.</Empty>
          : !rows.length ? <Empty title="No collections in this range">Try a wider date range or clear a filter.</Empty> : (
            <>
              <div className="report-kpis">
                <div><span>Receipts</span><strong>{rows.length}</strong></div>
                <div><span>Taxpayers</span><strong>{new Set(rows.map((r) => r.xtaxcode)).size}</strong></div>
                <div><span>Days with collection</span><strong>{days.length}</strong></div>
                <div><span>Total collected (BDT)</span><strong>{money(sumBy(rows, 'xtotal'))}</strong></div>
              </div>
              <div className="table-wrap">
                <table className="table report-table">
                  <thead>
                    <tr>
                      <th className="num">SL</th><th>Date</th><th>Receipt</th><th>Bill</th><th>Taxpayer</th><th>Ward</th><th>Period</th><th>Mode</th>
                      {AMOUNTS.map(([k, l]) => <th key={k} className="num">{l}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {days.map(([date, list]) => (
                      <Fragment key={date}>
                        {list.map((r) => (
                          <tr key={r.xreceiptno} className={r.xstatus === 'Cancelled' ? 'void-row' : ''}>
                            <td className="num">{++sl}</td>
                            <td>{fmtDate(r.xdate)}</td>
                            <td className="mono"><Link className="link" to={`/collections/${r.xreceiptno}`}>{r.xreceiptno}</Link>{r.xstatus === 'Cancelled' && <> <Badge>Cancelled</Badge></>}</td>
                            <td className="mono">{r.xbillno}</td>
                            <td>{r.xowner}<div className="muted small mono">{r.xtaxcode}</div></td>
                            <td>{r.xwardname}</td>
                            <td>{r.xfyear} Q{r.xquarter}{r.xupto_quarter !== r.xquarter && `–Q${r.xupto_quarter}`}</td>
                            <td>{r.xpaymode}{r.xbank && <div className="muted small">{r.xbank}</div>}</td>
                            {AMOUNTS.map(([k]) => <td key={k} className={`num ${k === 'xtotal' ? 'strong' : ''}`}>{k === 'xrebate' && r[k] ? `−${money(r[k])}` : money(r[k])}</td>)}
                          </tr>
                        ))}
                        {daily === '1' && (
                          <tr className="subtotal">
                            <td colSpan={8}>Subtotal {fmtDate(date)} · {list.length} receipt{list.length > 1 ? 's' : ''}</td>
                            {amountCells(list)}
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr><td colSpan={8}>Grand total · {rows.length} receipts</td>{amountCells(rows)}</tr>
                  </tfoot>
                </table>
              </div>
              <p className="report-note muted small">Total = Current − Rebate + Arrear + Surcharge. Amounts in BDT.</p>
            </>
          )}
      </section>
    </div>
  )
}

// ---------- Date-range collection report: summary (grouped) ----------
const GROUPS = {
  date: { label: 'Date', key: (r) => r.xdate, name: (k) => fmtDate(k) },
  month: { label: 'Month', key: (r) => r.xdate.slice(0, 7), name: (k) => `${MONTHS[Number(k.slice(5, 7)) - 1]} ${k.slice(0, 4)}` },
  ward: { label: 'Ward', key: (r) => r.xwardname, name: (k) => k },
  mode: { label: 'Payment mode', key: (r) => r.xpaymode, name: (k) => k },
  bank: { label: 'Bank', key: (r) => r.xbank || (r.xpaymode === 'Cash' ? 'Cash counter' : r.xpaymode), name: (k) => k },
  user: { label: 'Collected by', key: (r) => r.zemail, name: (k, db) => db.zxusers.find((u) => u.zemail === k)?.xname ?? k },
  period: { label: 'Bill period', key: (r) => `${r.xfyear} Q${r.xquarter}`, name: (k) => k },
}

export function CollectionSummaryReport() {
  const { db } = useData()
  const { can } = useAuth()
  const [f, setF] = useState(defaultFilters)
  const [group, setGroup] = useState('date')

  const rows = useMemo(() => applyFilters(collectionRows(db), f), [db, f])
  const groups = useMemo(() => {
    const g = GROUPS[group]
    const m = new Map()
    rows.forEach((r) => { const k = g.key(r); m.set(k, [...(m.get(k) || []), r]) })
    return [...m.entries()].sort((a, b) => (group === 'date' || group === 'month' || group === 'period' ? a[0].localeCompare(b[0]) : sumBy(b[1], 'xtotal') - sumBy(a[1], 'xtotal')))
  }, [rows, group])

  if (!can('holding.collections.view')) return <NoAccess />
  const valid = !(f.from && f.to && f.from > f.to)
  const total = sumBy(rows, 'xtotal')
  const g = GROUPS[group]

  function csv() {
    downloadCsv(`collection-summary-by-${group}_${f.from}_to_${f.to}.csv`,
      [g.label, 'Receipts', 'Taxpayers', 'Current', 'Rebate', 'Arrear', 'Surcharge', 'Total', 'Share %'],
      [
        ...groups.map(([k, list]) => [g.name(k, db), list.length, new Set(list.map((r) => r.xtaxcode)).size, ...AMOUNTS.map(([a]) => sumBy(list, a).toFixed(2)), total ? ((sumBy(list, 'xtotal') / total) * 100).toFixed(1) : '0']),
        ['Total', rows.length, new Set(rows.map((r) => r.xtaxcode)).size, ...AMOUNTS.map(([a]) => sumBy(rows, a).toFixed(2)), '100'],
      ])
  }

  return (
    <div className="page">
      <PageHeader title="Collection Report — Summary" subtitle="Collections in the date range, totalled by the grouping you choose."
        actions={<ReportActions onCsv={csv} disabled={!rows.length || !valid} />} />
      <ReportFilters db={db} f={f} setF={setF}>
        <Field label="Group by"><Select value={group} onChange={setGroup} options={Object.entries(GROUPS).map(([k, v]) => [k, v.label])} /></Field>
      </ReportFilters>

      <section className="card doc report">
        <ReportHeader db={db} title={`Collection Report — Summary by ${g.label}`} subtitle={filterSummary(db, f)} />
        {!valid ? <Empty title="Check the date range">The From date must be on or before the To date.</Empty>
          : !rows.length ? <Empty title="No collections in this range">Try a wider date range or clear a filter.</Empty> : (
            <>
              <div className="report-kpis">
                <div><span>Receipts</span><strong>{rows.length}</strong></div>
                <div><span>{g.label} groups</span><strong>{groups.length}</strong></div>
                <div><span>Rebate given (BDT)</span><strong>{money(sumBy(rows, 'xrebate'))}</strong></div>
                <div><span>Total collected (BDT)</span><strong>{money(total)}</strong></div>
              </div>
              <div className="table-wrap">
                <table className="table report-table">
                  <thead>
                    <tr>
                      <th>{g.label}</th><th className="num">Receipts</th><th className="num">Taxpayers</th>
                      {AMOUNTS.map(([k, l]) => <th key={k} className="num">{l}</th>)}
                      <th className="share-col">Share of total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map(([k, list]) => {
                      const share = total ? sumBy(list, 'xtotal') / total : 0
                      return (
                        <tr key={k}>
                          <td><strong>{g.name(k, db)}</strong></td>
                          <td className="num">{list.length}</td>
                          <td className="num">{new Set(list.map((r) => r.xtaxcode)).size}</td>
                          {AMOUNTS.map(([a]) => <td key={a} className={`num ${a === 'xtotal' ? 'strong' : ''}`}>{a === 'xrebate' && sumBy(list, a) ? `−${money(sumBy(list, a))}` : money(sumBy(list, a))}</td>)}
                          <td className="share-col"><span className="share"><i style={{ width: `${share * 100}%` }} /></span><span className="small">{(share * 100).toFixed(1)}%</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>Total</td><td className="num">{rows.length}</td><td className="num">{new Set(rows.map((r) => r.xtaxcode)).size}</td>
                      {AMOUNTS.map(([a]) => <td key={a} className="num">{a === 'xrebate' && sumBy(rows, a) ? `−${money(sumBy(rows, a))}` : money(sumBy(rows, a))}</td>)}
                      <td className="share-col small">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="report-note muted small">Total = Current − Rebate + Arrear + Surcharge. Amounts in BDT. Taxpayer counts are distinct holdings in each group.</p>
            </>
          )}
      </section>
    </div>
  )
}
