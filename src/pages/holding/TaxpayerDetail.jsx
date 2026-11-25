import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Building2, ClipboardList, Pencil, Receipt, User, Wallet, History } from 'lucide-react'
import { useData } from '../../data/store.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { Badge, Card, DataTable, Empty, KV, Modal, NoAccess, PageHeader, useToast } from '../../components/ui.jsx'
import { FormField } from '../../components/CrudPage.jsx'
import { OPEN_BILL, billDue, fmtDate, money, nowTs } from '../../data/tax.js'
import { taxpayerFields, taxpayerFromForm, taxpayerToForm, taxpayerValidate } from './taxpayerForm.jsx'

export default function TaxpayerDetail() {
  const { taxcode } = useParams()
  const { db, commit } = useData()
  const { can, user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [edit, setEdit] = useState(null)
  const [errors, setErrors] = useState({})

  if (!can('holding.taxpayers.view')) return <NoAccess />
  const tp = db.geo_holding_taxpayer.find((t) => t.xtaxcode === taxcode)
  if (!tp) return <div className="page"><PageHeader title="Taxpayer not found" back={{ to: '/taxpayers', label: 'Taxpayers' }} /></div>

  const building = db.geo_building.find((b) => b.xwardid === tp.xwardid && b.xroadid === tp.xroadid && b.xholdid === tp.xholdid)
  const road = db.geo_road.find((r) => r.xwardid === tp.xwardid && r.xroadid === tp.xroadid)
  const bills = db.geo_holding_bill.filter((b) => b.xtaxcode === tp.xtaxcode)
  const billNos = new Set(bills.map((b) => b.xbillno))
  const cols = db.geo_holding_collection.filter((c) => billNos.has(c.xbillno))
  const open = bills.filter((b) => OPEN_BILL.includes(b.xstatus))
  const due = open.reduce((s, b) => s + billDue(b), 0)
  const paid = cols.filter((c) => c.xstatus === 'Received').reduce((s, c) => s + c.xtotal, 0)
  const history = [
    ...db.geo_survey.filter((s) => s.xtaxcode === tp.xtaxcode).map((s) => ({ date: s.xdate, kind: 'Survey', ref: s.xsurveyno, to: '/survey', status: s.xstatus, detail: `${s.xflr_count} floors, ${s.xarea} sqft, ${s.xoccupancy}${s.xmonthly_rent ? `, rent ${money(s.xmonthly_rent)}/mo` : ''}` })),
    ...db.geo_assessment.filter((a) => a.xtaxcode === tp.xtaxcode).map((a) => ({ date: a.xdate, kind: 'Assessment', ref: a.xassessno, to: '/assessment', status: a.xstatus, detail: `Annual value ${money(a.xprev_annual_value)} → ${money(a.xannual_value)} (${a.xeffective_fyear})` })),
    ...db.geo_ownership_transfer.filter((t) => t.xtaxcode === tp.xtaxcode).map((t) => ({ date: t.xdate, kind: 'Ownership transfer', ref: t.xtransferno, to: '/transfer', status: t.xstatus, detail: `${t.xtype}: ${t.xfrom_owner} → ${t.xto_owner}` })),
  ]

  function save() {
    const errs = {}
    taxpayerFields.forEach((fd) => { if (fd.required && (!fd.show || fd.show(edit)) && (edit[fd.name] === '' || edit[fd.name] == null)) errs[fd.name] = 'Required' })
    Object.assign(errs, taxpayerValidate(edit, false, db))
    setErrors(errs)
    if (Object.keys(errs).length) return
    const row = { ...tp, ...taxpayerFromForm(edit, false, db), xtaxcode: tp.xtaxcode, zutime: nowTs(), zemail: user.zemail }
    commit((d) => { d.geo_holding_taxpayer = d.geo_holding_taxpayer.map((t) => (t.xtaxcode === tp.xtaxcode ? row : t)) },
      { module: 'taxpayers', action: 'update', ref: tp.xtaxcode, message: `Updated taxpayer ${tp.xtaxcode} (${row.xowner})` })
    toast('Taxpayer saved')
    setEdit(null)
  }

  return (
    <div className="page">
      <PageHeader
        back={{ to: '/taxpayers', label: 'Taxpayers' }}
        title={<span>{tp.xowner} <Badge>{tp.xstatus}</Badge></span>}
        subtitle={<><span className="mono">{tp.xtaxcode}</span> · {tp.xhousename || 'No house name'} · {road?.xdesc}</>}
        actions={<>
          {can('holding.collections.create') && open.length > 0 && <Link className="btn btn-primary" to={`/collections/new?bill=${open[open.length - 1].xbillno}`}><Wallet size={16} /> Collect payment</Link>}
          {can('holding.taxpayers.manage') && <button type="button" className="btn btn-ghost" onClick={() => { setErrors({}); setEdit(taxpayerToForm(tp)) }}><Pencil size={15} /> Edit</button>}
        </>}
      />

      <div className="kpi-grid">
        <div className="card kpi"><span className="kpi-icon"><Receipt size={18} /></span><div><div className="kpi-value">{money(tp.xannual_value)}</div><div className="kpi-label">Annual value (BDT)</div></div></div>
        <div className="card kpi"><span className="kpi-icon"><History size={18} /></span><div><div className="kpi-value">{bills.length}</div><div className="kpi-label">Bills issued</div></div></div>
        <div className="card kpi"><span className="kpi-icon"><Wallet size={18} /></span><div><div className="kpi-value">{money(paid)}</div><div className="kpi-label">Total paid (BDT)</div></div></div>
        <div className={`card kpi ${due ? 'kpi-alert' : ''}`}><span className="kpi-icon"><Receipt size={18} /></span><div><div className="kpi-value">{money(due)}</div><div className="kpi-label">Due now (BDT)</div></div></div>
      </div>

      <div className="grid-2">
        <Card icon={User} title="Owner">
          <KV items={[
            ['Name', tp.xowner], ['Name (Bangla)', <span className="bn">{tp.xownerbn}</span>], ["Father's / mother's name", tp.xguardian],
            ['Spouse', tp.xspouse], ['Mobile', tp.xmobile], ['NID', tp.xnid], ['Email', tp.xemail], ['Taxpayer type', <span className="bn">{tp.xtaxpayertype}</span>],
          ]} />
        </Card>
        <Card icon={Building2} title="Property" right={building ? <Link className="link" to="/buildings">Building {building.xholdid}</Link> : tp.xbuilding_notfound ? 'Building not in survey' : null}>
          <KV items={[
            ['Ward / road', `${String(tp.xwardid).padStart(2, '0')} / ${String(tp.xroadid).padStart(3, '0')}`],
            ['Road name', <span className="bn">{tp.xroadname}</span>], ['Holding / ext', `${tp.xholdid} / ${tp.xholdext}`],
            ['Address', <span className="bn">{tp.xaddress}</span>], ['Area', tp.xarea ? `${tp.xarea} sqft` : null],
            ['Property type', <span className="bn">{tp.xproptype}</span>], ['Use', <span className="bn">{tp.xpropuse}</span>],
            ['Building', building ? `${building.xholdname} · ${building.xflr_count ?? '?'} floors · ${building.xstype ?? ''}` : null],
          ]} />
        </Card>
      </div>

      <Card icon={Receipt} title="Bills" right={`${bills.length} total`}>
        <DataTable
          rows={bills} rowKey={(b) => b.xbillno} onRowClick={(b) => navigate(`/bills/${b.xbillno}`)} pageSize={8}
          initialSort={{ key: 'xissuedate', dir: 'desc' }}
          empty={<Empty title="No bills yet">Generate bills from Billing → Generate Bills.</Empty>}
          columns={[
            { key: 'xbillno', label: 'Bill no', className: 'mono' },
            { key: 'period', label: 'Period', sort: (b) => `${b.xfyear}${b.xquarter}`, render: (b) => `${b.xfyear} Q${b.xquarter}` },
            { key: 'xissuedate', label: 'Issued', render: (b) => fmtDate(b.xissuedate) },
            { key: 'xlastdate', label: 'Due by', render: (b) => fmtDate(b.xlastdate) },
            { key: 'xcurrent_total', label: 'Current', num: true, render: (b) => money(b.xcurrent_total) },
            { key: 'xarrear', label: 'Arrear', num: true, render: (b) => money(b.xarrear) },
            { key: 'xsurcharge', label: 'Surcharge', num: true, render: (b) => money(b.xsurcharge) },
            { key: 'due', label: 'Total', num: true, sort: billDue, render: (b) => <strong>{money(billDue(b))}</strong> },
            { key: 'xstatus', label: 'Status', render: (b) => <Badge>{b.xstatus}</Badge> },
          ]}
        />
      </Card>

      <Card icon={ClipboardList} title="Survey, assessment & ownership history" right={`${history.length} records`}>
        <DataTable
          rows={history} rowKey={(h) => h.ref} pageSize={8} initialSort={{ key: 'date', dir: 'desc' }}
          onRowClick={(h) => navigate(h.to)}
          empty={<Empty title="No surveys, assessments or transfers yet" />}
          columns={[
            { key: 'date', label: 'Date', render: (h) => fmtDate(h.date) },
            { key: 'kind', label: 'Type' },
            { key: 'ref', label: 'Ref', className: 'mono' },
            { key: 'detail', label: 'Details' },
            { key: 'status', label: 'Status', render: (h) => <Badge tone={{ Approved: 'ok', Verified: 'ok', Pending: 'warn', Draft: 'warn', Submitted: 'warn', Rejected: 'danger' }[h.status]}>{h.status}</Badge> },
          ]}
        />
      </Card>

      <Card icon={Wallet} title="Payments" right={`${cols.length} receipts`}>
        <DataTable
          rows={cols} rowKey={(c) => c.xreceiptno} onRowClick={(c) => navigate(`/collections/${c.xreceiptno}`)} pageSize={8}
          initialSort={{ key: 'xdate', dir: 'desc' }}
          empty={<Empty title="No payments recorded" />}
          columns={[
            { key: 'xreceiptno', label: 'Receipt', className: 'mono' },
            { key: 'xdate', label: 'Date', render: (c) => fmtDate(c.xdate) },
            { key: 'xbillno', label: 'Bill', className: 'mono' },
            { key: 'xupto_quarter', label: 'Up to', render: (c) => `Q${c.xupto_quarter}` },
            { key: 'xpaymode', label: 'Mode' },
            { key: 'xtotal', label: 'Amount', num: true, render: (c) => <strong>{money(c.xtotal)}</strong> },
            { key: 'xstatus', label: 'Status', render: (c) => <Badge>{c.xstatus}</Badge> },
          ]}
        />
      </Card>

      {edit && (
        <Modal title={`Edit taxpayer ${tp.xtaxcode}`} size="lg" onClose={() => setEdit(null)} footer={<>
          <button type="button" className="btn btn-ghost" onClick={() => setEdit(null)}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={save}>Save changes</button>
        </>}>
          <form className="form-grid" onSubmit={(e) => { e.preventDefault(); save() }} noValidate>
            {taxpayerFields.filter((fd) => !fd.show || fd.show(edit)).map((fd) => (
              <FormField key={fd.name + (fd.type || '')} fd={fd} form={edit} set={(p) => setEdit((e) => ({ ...e, ...p }))} error={errors[fd.name]} isNew={false} db={db} />
            ))}
            <button type="submit" hidden />
          </form>
        </Modal>
      )}
    </div>
  )
}
