import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useData } from '../../data/store.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { Badge, Card, DataTable, NoAccess, PageHeader, SearchBox, Select } from '../../components/ui.jsx'
import { fmtDate, money } from '../../data/tax.js'

export default function Collections() {
  const { db } = useData()
  const { can } = useAuth()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [mode, setMode] = useState('')
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return db.geo_holding_collection.map((c) => {
      const b = db.geo_holding_bill.find((x) => x.xbillno === c.xbillno)
      const t = b && db.geo_holding_taxpayer.find((x) => x.xtaxcode === b.xtaxcode)
      return { ...c, _code: b?.xtaxcode, _owner: t?.xowner }
    }).filter((c) => (!mode || c.xpaymode === mode) && (!status || c.xstatus === status) && (!from || c.xdate >= from) && (!to || c.xdate <= to)
      && (!s || `${c.xreceiptno} ${c.xbillno} ${c._code} ${c._owner} ${c.xtrnref}`.toLowerCase().includes(s)))
  }, [db, q, mode, status, from, to])

  if (!can('holding.collections.view')) return <NoAccess />
  const received = rows.filter((c) => c.xstatus === 'Received')
  const total = received.reduce((s, c) => s + c.xtotal, 0)

  return (
    <div className="page">
      <PageHeader title="Collections" subtitle="Payments received against holding tax bills."
        actions={can('holding.collections.create') && <Link to="/collections/new" className="btn btn-primary"><Plus size={16} /> New collection</Link>} />
      <Card>
        <div className="toolbar">
          <SearchBox value={q} onChange={setQ} placeholder="Receipt, bill, tax code, owner or reference" />
          <Select value={mode} onChange={setMode} options={db.xcodes.filter((c) => c.xtype === 'PayMode').map((c) => c.xcode)} placeholder="All modes" aria-label="Payment mode" />
          <Select value={status} onChange={setStatus} options={['Received', 'Cancelled']} placeholder="All statuses" aria-label="Status" />
          <label className="date-filter">From <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="date-filter">To <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        </div>
        <DataTable
          rows={rows} rowKey={(c) => c.xreceiptno} onRowClick={(c) => navigate(`/collections/${c.xreceiptno}`)} initialSort={{ key: 'xdate', dir: 'desc' }}
          columns={[
            { key: 'xreceiptno', label: 'Receipt', className: 'mono' },
            { key: 'xdate', label: 'Date', render: (c) => fmtDate(c.xdate) },
            { key: 'xbillno', label: 'Bill', className: 'mono' },
            { key: '_owner', label: 'Taxpayer', render: (c) => <>{c._owner}<div className="muted small mono">{c._code}</div></> },
            { key: 'xupto_quarter', label: 'Up to', render: (c) => `Q${c.xupto_quarter}` },
            { key: 'xpaymode', label: 'Mode', render: (c) => <>{c.xpaymode}{c.xbank && <div className="muted small">{c.xbank}</div>}</> },
            { key: 'xrebate', label: 'Rebate', num: true, render: (c) => money(c.xrebate) },
            { key: 'xtotal', label: 'Amount', num: true, render: (c) => <strong>{money(c.xtotal)}</strong> },
            { key: 'xstatus', label: 'Status', render: (c) => <Badge>{c.xstatus}</Badge> },
          ]}
          footer={rows.length > 0 && <tr><td colSpan={7}>{received.length} received of {rows.length}</td><td className="num">{money(total)}</td><td /></tr>}
        />
      </Card>
    </div>
  )
}
