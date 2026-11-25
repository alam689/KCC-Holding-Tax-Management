import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, FilePlus2, SkipForward, Settings2 } from 'lucide-react'
import { useData } from '../../data/store.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { Card, DataTable, Empty, Field, NoAccess, PageHeader, Select, useToast } from '../../components/ui.jsx'
import { applyBillPlan, fiscalYearOf, fiscalYears, money, planBills, policy, quarterOf, quarterRange, taxComponents, today, totalRate } from '../../data/tax.js'

export default function GenerateBills() {
  const { db, commit } = useData()
  const { can, user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [fyear, setFy] = useState(fiscalYearOf())
  const [quarter, setQ] = useState(quarterOf())
  const [issueDate, setIssue] = useState(today())
  const [ward, setWard] = useState('')
  const [road, setRoad] = useState('')

  const taxcodes = useMemo(() => db.geo_holding_taxpayer
    .filter((t) => (!ward || t.xwardid === Number(ward)) && (!road || t.xroadid === Number(road)))
    .map((t) => t.xtaxcode), [db, ward, road])
  const plan = useMemo(() => planBills(db, { fyear, quarter: Number(quarter), issueDate, taxcodes, actor: user?.zemail }), [db, fyear, quarter, issueDate, taxcodes, user])

  if (!can('holding.bills.generate')) return <NoAccess />
  const comps = taxComponents(db)
  const pol = policy(db)
  const range = quarterRange(fyear, Number(quarter))
  const total = plan.bills.reduce((s, b) => s + b.xcurrent_total + b.xarrear + b.xsurcharge, 0)

  function generate() {
    commit((d) => applyBillPlan(d, plan), {
      kind: 'notice', module: 'bills', action: 'generate', ref: `${fyear}-Q${quarter}`, path: `/bills?fy=${fyear}&q=${quarter}`,
      message: `Generated ${plan.bills.length} bills for ${fyear} Q${quarter}${plan.carried.length ? `; ${plan.carried.length} unpaid bills carried into arrears` : ''}`,
    })
    toast(`${plan.bills.length} bills generated`)
    navigate(`/bills?fy=${fyear}&q=${quarter}`)
  }

  return (
    <div className="page">
      <PageHeader back={{ to: '/bills', label: 'Bills' }} title="Generate Bills"
        subtitle="Preview the quarterly bills before creating them. Nothing is saved until you press Generate." />

      <div className="grid-2-1">
        <Card icon={FilePlus2} title="Billing period">
          <div className="form-grid">
            <Field label="Fiscal year"><Select value={fyear} onChange={setFy} options={fiscalYears()} /></Field>
            <Field label="Quarter"><Select value={quarter} onChange={(v) => setQ(Number(v))} options={[1, 2, 3, 4].map((n) => [n, `Q${n} (${['Jul–Sep', 'Oct–Dec', 'Jan–Mar', 'Apr–Jun'][n - 1]})`])} /></Field>
            <Field label="Issue date"><input className="input" type="date" value={issueDate} onChange={(e) => setIssue(e.target.value)} /></Field>
            <Field label="Last date to pay" hint="End of the quarter"><div className="input readonly">{range.end}</div></Field>
            <Field label="Ward"><Select value={ward} onChange={(v) => { setWard(v); setRoad('') }} options={db.geo_ward.map((w) => [String(w.xwardid), w.xwardname])} placeholder="All wards" /></Field>
            <Field label="Road"><Select value={road} onChange={setRoad} options={db.geo_road.filter((r) => !ward || r.xwardid === Number(ward)).map((r) => [String(r.xroadid), `${String(r.xroadid).padStart(3, '0')} · ${r.xdesc}`])} placeholder="All roads" /></Field>
          </div>
        </Card>
        <Card icon={Settings2} title="Rates applied" footer={<span>Edit rates in Settings → Codes</span>}>
          <ul className="rate-list">
            {comps.map((c) => <li key={c.code}><span>{c.name} <small className="bn muted">{c.namebn}</small></span><strong>{c.rate}%</strong></li>)}
            <li className="total"><span>Total of annual value</span><strong>{totalRate(db)}%</strong></li>
            <li><span>Rebate (full year paid in Q1)</span><strong>{pol.rebatePct}%</strong></li>
            <li><span>Surcharge on overdue arrears</span><strong>{pol.surchargePct}%</strong></li>
          </ul>
        </Card>
      </div>

      <Card icon={CheckCircle2} title={`${plan.bills.length} bills will be created`} right={`Total demand ${money(total)} BDT`}
        footer={<>
          <span>{plan.carried.length ? `${plan.carried.length} unpaid earlier bills will be marked Carried and added as arrears.` : 'No arrears to carry forward.'}</span>
          <button type="button" className="btn btn-primary" disabled={!plan.bills.length} onClick={generate}><FilePlus2 size={16} /> Generate {plan.bills.length} bills</button>
        </>}>
        <DataTable
          rows={plan.bills} rowKey={(b) => b.xbillno} pageSize={10}
          empty={<Empty title="No bills to generate">Every holding in this selection is already billed, paid in advance, or exempt.</Empty>}
          columns={[
            { key: 'xbillno', label: 'Bill no', className: 'mono' },
            { key: 'xtaxcode', label: 'Tax code', className: 'mono' },
            { key: 'owner', label: 'Owner', render: (b) => db.geo_holding_taxpayer.find((t) => t.xtaxcode === b.xtaxcode)?.xowner },
            { key: 'xannual_value', label: 'Annual value', num: true, render: (b) => money(b.xannual_value) },
            { key: 'xcurrent_total', label: `Q${quarter} current`, num: true, render: (b) => money(b.xcurrent_total) },
            { key: 'xarrear', label: 'Arrear', num: true, render: (b) => money(b.xarrear) },
            { key: 'xsurcharge', label: 'Surcharge', num: true, render: (b) => money(b.xsurcharge) },
            { key: 'total', label: 'Total', num: true, sort: (b) => b.xcurrent_total + b.xarrear + b.xsurcharge, render: (b) => <strong>{money(b.xcurrent_total + b.xarrear + b.xsurcharge)}</strong> },
          ]}
        />
      </Card>

      {plan.skipped.length > 0 && (
        <Card icon={SkipForward} title={`${plan.skipped.length} holdings skipped`}>
          <DataTable
            rows={plan.skipped} rowKey={(s) => s.taxpayer.xtaxcode} pageSize={10}
            columns={[
              { key: 'code', label: 'Tax code', className: 'mono', render: (s) => s.taxpayer.xtaxcode },
              { key: 'owner', label: 'Owner', render: (s) => s.taxpayer.xowner },
              { key: 'reason', label: 'Reason' },
            ]}
          />
        </Card>
      )}
    </div>
  )
}
