import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BadgeCheck, Ban, Printer, Wallet } from 'lucide-react'
import { useData } from '../../data/store.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { Badge, Card, Confirm, DataTable, Empty, KV, NoAccess, PageHeader, useToast } from '../../components/ui.jsx'
import { OPEN_BILL, billDue, fmtDate, money, nowTs } from '../../data/tax.js'
import Emblem from '../../components/Emblem.jsx'

export default function BillDetail() {
  const { billno } = useParams()
  const { db, commit } = useData()
  const { can, user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [confirm, setConfirm] = useState(null)

  if (!can('holding.bills.view')) return <NoAccess />
  const bill = db.geo_holding_bill.find((b) => b.xbillno === billno)
  if (!bill) return <div className="page"><PageHeader title="Bill not found" back={{ to: '/bills', label: 'Bills' }} /></div>
  const tp = db.geo_holding_taxpayer.find((t) => t.xtaxcode === bill.xtaxcode)
  const biz = db.zbusiness[0]
  const details = db.geo_holding_billdetail.filter((d) => d.xbillno === bill.xbillno).sort((a, b) => a.xrow - b.xrow)
  const opts = db.geo_holding_billopt.filter((o) => o.xbillno === bill.xbillno).sort((a, b) => a.xupto_quarter - b.xupto_quarter)
  const cols = db.geo_holding_collection.filter((c) => c.xbillno === bill.xbillno)
  const received = cols.some((c) => c.xstatus === 'Received')
  const isOpen = OPEN_BILL.includes(bill.xstatus)
  const latest = db.geo_holding_bill.filter((b) => b.xtaxcode === bill.xtaxcode && b.xstatus !== 'Cancelled').sort((a, b) => b.xissuedate.localeCompare(a.xissuedate) || b.xbillno.localeCompare(a.xbillno))[0]
  const canCancel = can('holding.bills.cancel') && isOpen && !received && latest?.xbillno === bill.xbillno
  const sumCol = (k) => details.reduce((s, d) => s + d[k], 0)

  function approve() {
    commit((d) => { d.geo_holding_bill = d.geo_holding_bill.map((b) => (b.xbillno === bill.xbillno ? { ...b, xapproved_by: user.zemail, zutime: nowTs() } : b)) },
      { module: 'bills', action: 'approve', ref: bill.xbillno, message: `Approved bill ${bill.xbillno}` })
    toast('Bill approved')
  }
  function cancel() {
    commit((d) => {
      d.geo_holding_bill = d.geo_holding_bill.map((b) => {
        if (b.xbillno === bill.xbillno) return { ...b, xstatus: 'Cancelled', zutime: nowTs(), zemail: user.zemail }
        // Arrears carried into this bill go back to being open.
        if (bill.xarrear > 0 && b.xtaxcode === bill.xtaxcode && b.xstatus === 'Carried') return { ...b, xstatus: 'Issued', zutime: nowTs() }
        return b
      })
    }, { module: 'bills', action: 'cancel', ref: bill.xbillno, message: `Cancelled bill ${bill.xbillno}` })
    toast('Bill cancelled', 'warn')
  }

  return (
    <div className="page">
      <PageHeader
        back={{ to: '/bills', label: 'Bills' }}
        title={<span><span className="mono">{bill.xbillno}</span> <Badge>{bill.xstatus}</Badge></span>}
        subtitle={<>{bill.xfyear} Q{bill.xquarter} · <Link className="link" to={`/taxpayers/${bill.xtaxcode}`}>{tp?.xowner} ({bill.xtaxcode})</Link></>}
        actions={<>
          {can('holding.bills.generate') && !bill.xapproved_by && bill.xstatus !== 'Cancelled' && <button type="button" className="btn btn-ghost" onClick={approve}><BadgeCheck size={16} /> Approve</button>}
          {canCancel && <button type="button" className="btn btn-ghost danger" onClick={() => setConfirm(true)}><Ban size={16} /> Cancel bill</button>}
          <button type="button" className="btn btn-ghost" onClick={() => window.print()}><Printer size={16} /> Print</button>
        </>}
      />

      <section className="card doc">
        <header className="doc-head">
          <Emblem size={44} />
          <div>
            <h2>{biz.zorg}</h2>
            <p>Holding Tax Demand Bill · Fiscal year {bill.xfyear}, quarter {bill.xquarter}</p>
          </div>
          <div className="doc-no">
            <span>Bill no</span><strong className="mono">{bill.xbillno}</strong>
            <Badge>{bill.xstatus}</Badge>
          </div>
        </header>
        <div className="doc-grid">
          <KV items={[
            ['Tax code', <span className="mono">{bill.xtaxcode}</span>], ['Owner', tp?.xowner], ['Owner (Bangla)', <span className="bn">{tp?.xownerbn}</span>],
            ['Address', <span className="bn">{tp?.xaddress}</span>], ['Mobile', tp?.xmobile],
          ]} />
          <KV items={[
            ['Issue date', fmtDate(bill.xissuedate)], ['Last date to pay', <strong>{fmtDate(bill.xlastdate)}</strong>],
            ['Annual value', `${money(bill.xannual_value)} BDT`], ['Prepared by', bill.xprepared_by], ['Approved by', bill.xapproved_by || <span className="text-warn">Not yet approved</span>],
          ]} />
        </div>

        <h4 className="doc-section">Tax components</h4>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>#</th><th>Component</th><th className="num">Rate</th><th className="num">Annual</th><th className="num">Q1</th><th className="num">Q2</th><th className="num">Q3</th><th className="num">Q4</th></tr></thead>
            <tbody>
              {details.map((d) => (
                <tr key={d.xrow}>
                  <td>{d.xrow}</td><td>{d.xcomponent} <span className="bn muted small">{d.xcomponentbn}</span></td>
                  <td className="num">{d.xrate}%</td><td className="num">{money(d.xannual)}</td>
                  {[1, 2, 3, 4].map((k) => <td key={k} className={`num ${k === bill.xquarter ? 'hl' : ''}`}>{money(d[`xq${k}`])}</td>)}
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td /><td>Total</td><td className="num">{details.reduce((s, d) => s + d.xrate, 0)}%</td><td className="num">{money(sumCol('xannual'))}</td>
              {[1, 2, 3, 4].map((k) => <td key={k} className={`num ${k === bill.xquarter ? 'hl' : ''}`}>{money(sumCol(`xq${k}`))}</td>)}</tr></tfoot>
          </table>
        </div>

        <div className="doc-summary">
          <KV items={[
            [`Current (Q${bill.xquarter})`, money(bill.xcurrent_total)],
            [`Arrear${bill.xarrear_fyear ? ` (since ${bill.xarrear_fyear})` : ''}`, money(bill.xarrear)],
            ['Surcharge', money(bill.xsurcharge)],
            ['Total payable', <strong className="big">{money(billDue(bill))} BDT</strong>],
          ]} />
        </div>

        <h4 className="doc-section">Payment options</h4>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Pay up to</th><th className="num">Current</th><th className="num">Rebate</th><th className="num">Arrear</th><th className="num">Surcharge</th><th className="num">Total</th><th className="no-print" /></tr></thead>
            <tbody>
              {opts.map((o) => (
                <tr key={o.xupto_quarter}>
                  <td>Q{o.xupto_quarter}{o.xupto_quarter === 4 ? ' (rest of year)' : ''}</td>
                  <td className="num">{money(o.xcurrent)}</td>
                  <td className="num">{o.xrebate ? <span className="text-ok">−{money(o.xrebate)}</span> : '0.00'}</td>
                  <td className="num">{money(o.xarrear)}</td><td className="num">{money(o.xsurcharge)}</td>
                  <td className="num"><strong>{money(o.xtotal)}</strong></td>
                  <td className="num no-print">
                    {isOpen && can('holding.collections.create') && <Link className="btn btn-primary btn-sm" to={`/collections/new?bill=${bill.xbillno}&upto=${o.xupto_quarter}`}><Wallet size={14} /> Collect</Link>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Card icon={Wallet} title="Payments against this bill" className="no-print">
        <DataTable
          rows={cols} rowKey={(c) => c.xreceiptno} onRowClick={(c) => navigate(`/collections/${c.xreceiptno}`)}
          empty={<Empty title="No payments yet" />}
          columns={[
            { key: 'xreceiptno', label: 'Receipt', className: 'mono' },
            { key: 'xdate', label: 'Date', render: (c) => fmtDate(c.xdate) },
            { key: 'xupto_quarter', label: 'Up to', render: (c) => `Q${c.xupto_quarter}` },
            { key: 'xpaymode', label: 'Mode' },
            { key: 'xtotal', label: 'Amount', num: true, render: (c) => <strong>{money(c.xtotal)}</strong> },
            { key: 'xstatus', label: 'Status', render: (c) => <Badge>{c.xstatus}</Badge> },
          ]}
        />
      </Card>

      {confirm && <Confirm title="Cancel this bill?" danger confirmLabel="Cancel bill" onConfirm={cancel} onClose={() => setConfirm(null)}
        message={`${bill.xbillno} will be marked Cancelled.${bill.xarrear > 0 ? ' The earlier unpaid bills it carried as arrears will be reopened.' : ''}`} />}
    </div>
  )
}
