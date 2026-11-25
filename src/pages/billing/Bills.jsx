import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FilePlus2 } from 'lucide-react'
import { useData } from '../../data/store.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { Badge, Card, DataTable, NoAccess, PageHeader, SearchBox, Select } from '../../components/ui.jsx'
import { billDue, fiscalYearOf, fmtDate, money } from '../../data/tax.js'

export default function Bills() {
  const { db } = useData()
  const { can } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const f = {
    fy: params.get('fy') ?? fiscalYearOf(), qtr: params.get('q') ?? '', ward: params.get('ward') ?? '', status: params.get('status') ?? '',
  }
  const setF = (k, v) => { const p = new URLSearchParams(params); v ? p.set(k, v) : p.delete(k); setParams(p, { replace: true }) }

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return db.geo_holding_bill
      .map((b) => ({ ...b, _tp: db.geo_holding_taxpayer.find((t) => t.xtaxcode === b.xtaxcode) }))
      .filter((b) => (!f.fy || b.xfyear === f.fy) && (!f.qtr || b.xquarter === Number(f.qtr)) && (!f.status || b.xstatus === f.status)
        && (!f.ward || b._tp?.xwardid === Number(f.ward))
        && (!s || `${b.xbillno} ${b.xtaxcode} ${b._tp?.xowner}`.toLowerCase().includes(s)))
  }, [db, q, f.fy, f.qtr, f.status, f.ward])

  if (!can('holding.bills.view')) return <NoAccess />
  const fys = [...new Set(db.geo_holding_bill.map((b) => b.xfyear).concat(fiscalYearOf()))].sort().reverse()
  const sum = (k) => rows.reduce((s, b) => s + (typeof k === 'function' ? k(b) : b[k]), 0)

  return (
    <div className="page">
      <PageHeader title="Holding Tax Bills" subtitle="Quarterly demand bills. Open a bill to see its tax components and payment options."
        actions={can('holding.bills.generate') && <Link to="/bills/generate" className="btn btn-primary"><FilePlus2 size={16} /> Generate bills</Link>} />
      <Card>
        <div className="toolbar">
          <SearchBox value={q} onChange={setQ} placeholder="Bill no, tax code or owner" />
          <Select value={f.fy} onChange={(v) => setF('fy', v)} options={fys} placeholder="All years" aria-label="Fiscal year" />
          <Select value={f.qtr} onChange={(v) => setF('q', v)} options={[1, 2, 3, 4].map((n) => [String(n), `Q${n}`])} placeholder="All quarters" aria-label="Quarter" />
          <Select value={f.ward} onChange={(v) => setF('ward', v)} options={db.geo_ward.map((w) => [String(w.xwardid), w.xwardname])} placeholder="All wards" aria-label="Ward" />
          <Select value={f.status} onChange={(v) => setF('status', v)} options={['Issued', 'Partial', 'Paid', 'Carried', 'Cancelled']} placeholder="All statuses" aria-label="Status" />
        </div>
        <DataTable
          rows={rows} rowKey={(b) => b.xbillno} onRowClick={(b) => navigate(`/bills/${b.xbillno}`)} initialSort={{ key: 'xbillno', dir: 'desc' }}
          columns={[
            { key: 'xbillno', label: 'Bill no', className: 'mono' },
            { key: 'xtaxcode', label: 'Tax code', className: 'mono' },
            { key: 'owner', label: 'Owner', sort: (b) => b._tp?.xowner, render: (b) => b._tp?.xowner ?? '—' },
            { key: 'period', label: 'Period', sort: (b) => `${b.xfyear}${b.xquarter}`, render: (b) => `${b.xfyear} Q${b.xquarter}` },
            { key: 'xlastdate', label: 'Due by', render: (b) => fmtDate(b.xlastdate) },
            { key: 'xcurrent_total', label: 'Current', num: true, render: (b) => money(b.xcurrent_total) },
            { key: 'xarrear', label: 'Arrear', num: true, render: (b) => money(b.xarrear) },
            { key: 'xsurcharge', label: 'Surcharge', num: true, render: (b) => money(b.xsurcharge) },
            { key: 'due', label: 'Total', num: true, sort: billDue, render: (b) => <strong>{money(billDue(b))}</strong> },
            { key: 'xstatus', label: 'Status', render: (b) => <Badge>{b.xstatus}</Badge> },
          ]}
          footer={rows.length > 0 && (
            <tr>
              <td colSpan={5}>{rows.length} bills</td>
              <td className="num">{money(sum('xcurrent_total'))}</td>
              <td className="num">{money(sum('xarrear'))}</td>
              <td className="num">{money(sum('xsurcharge'))}</td>
              <td className="num">{money(sum(billDue))}</td>
              <td />
            </tr>
          )}
        />
      </Card>
    </div>
  )
}
