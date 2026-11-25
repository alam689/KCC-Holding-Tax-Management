import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCheck, RotateCcw } from 'lucide-react'
import { useData } from '../../data/store.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { Badge, Card, Confirm, DataTable, Empty, NoAccess, PageHeader, SearchBox, Select, useToast } from '../../components/ui.jsx'
import { fmtTs } from '../../data/tax.js'

// zxevents — PK (zid, xevent). Activity log plus per-user notices (xread = 0 means unread).
export default function Activity() {
  const { db, commit, reset } = useData()
  const { can, user, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [mod, setMod] = useState('')
  const [kind, setKind] = useState('')
  const [who, setWho] = useState('')
  const [confirm, setConfirm] = useState(false)

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return db.zxevents.filter((e) => (!mod || e.xmodule === mod) && (!kind || e.xkind === kind) && (!who || e.zemail === who)
      && (!s || `${e.xmessage} ${e.xtrnnum} ${e.zemail}`.toLowerCase().includes(s)))
  }, [db.zxevents, q, mod, kind, who])

  if (!can('settings.system_config.view')) return <NoAccess />
  const unread = db.zxevents.filter((e) => e.zemail === user.zemail && e.xread === 0).length

  return (
    <div className="page">
      <PageHeader title="Activity Log" subtitle="Every change made in this browser, newest first. Notices also appear under the bell."
        actions={<>
          {unread > 0 && <button type="button" className="btn btn-ghost" onClick={() => commit((d) => { d.zxevents = d.zxevents.map((e) => (e.zemail === user.zemail ? { ...e, xread: 1 } : e)) })}><CheckCheck size={16} /> Mark my {unread} notices read</button>}
          {can('settings.system_config.update') && <button type="button" className="btn btn-ghost danger" onClick={() => setConfirm(true)}><RotateCcw size={16} /> Reset demo data</button>}
        </>} />
      <Card>
        <div className="toolbar">
          <SearchBox value={q} onChange={setQ} />
          <Select value={mod} onChange={setMod} options={[...new Set(db.zxevents.map((e) => e.xmodule))].sort()} placeholder="All modules" aria-label="Module" />
          <Select value={kind} onChange={setKind} options={[['activity', 'Activity'], ['notice', 'Notice']]} placeholder="All kinds" aria-label="Kind" />
          <Select value={who} onChange={setWho} options={db.zxusers.map((u) => [u.zemail, u.xname])} placeholder="All users" aria-label="User" />
        </div>
        <DataTable
          rows={rows} rowKey={(e) => e.xevent} initialSort={{ key: 'xevent', dir: 'desc' }} pageSize={20}
          onRowClick={(e) => e.xpath && navigate(e.xpath)}
          empty={<Empty title="No activity yet">Changes you make will be listed here.</Empty>}
          columns={[
            { key: 'xevent', label: '#', num: true },
            { key: 'ztime', label: 'When', render: (e) => fmtTs(e.ztime) },
            { key: 'zemail', label: 'User' },
            { key: 'xmodule', label: 'Module' },
            { key: 'xaction', label: 'Action', render: (e) => <Badge tone={{ create: 'ok', update: 'info', delete: 'danger', cancel: 'danger', generate: 'info', approve: 'ok' }[e.xaction]}>{e.xaction}</Badge> },
            { key: 'xmessage', label: 'Details', render: (e) => <>{e.xmessage}{e.xkind === 'notice' && <Badge tone="warn">notice</Badge>}</> },
            { key: 'xtrnnum', label: 'Ref', className: 'mono' },
          ]}
        />
      </Card>
      {confirm && <Confirm title="Reset demo data?" danger confirmLabel="Reset" onClose={() => setConfirm(false)}
        message="All changes made in this browser are discarded and the original sample data is restored. You'll be signed out."
        onConfirm={() => { reset(); logout(); toast('Demo data restored') }} />}
    </div>
  )
}
