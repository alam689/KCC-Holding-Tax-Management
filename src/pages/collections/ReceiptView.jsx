import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Ban, Printer } from 'lucide-react'
import { useData } from '../../data/store.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { Badge, Confirm, KV, NoAccess, PageHeader, useToast } from '../../components/ui.jsx'
import { fmtDate, fmtTs, money, nowTs } from '../../data/tax.js'
import Emblem from '../../components/Emblem.jsx'

export default function ReceiptView() {
  const { receiptno } = useParams()
  const { db, commit } = useData()
  const { can, user } = useAuth()
  const toast = useToast()
  const [confirm, setConfirm] = useState(false)

  if (!can('holding.collections.view')) return <NoAccess />
  const c = db.geo_holding_collection.find((x) => x.xreceiptno === receiptno)
  if (!c) return <div className="page"><PageHeader title="Receipt not found" back={{ to: '/collections', label: 'Collections' }} /></div>
  const bill = db.geo_holding_bill.find((b) => b.xbillno === c.xbillno)
  const tp = bill && db.geo_holding_taxpayer.find((t) => t.xtaxcode === bill.xtaxcode)
  const biz = db.zbusiness[0]

  function cancel() {
    commit((d) => {
      d.geo_holding_collection = d.geo_holding_collection.map((x) => (x.xreceiptno === c.xreceiptno ? { ...x, xstatus: 'Cancelled', zutime: nowTs(), zemail: user.zemail } : x))
      // The bill is open again unless another receipt still covers it.
      const other = d.geo_holding_collection.some((x) => x.xbillno === c.xbillno && x.xreceiptno !== c.xreceiptno && x.xstatus === 'Received')
      if (!other) d.geo_holding_bill = d.geo_holding_bill.map((b) => (b.xbillno === c.xbillno && b.xstatus === 'Paid' ? { ...b, xstatus: 'Issued', zutime: nowTs() } : b))
    }, { module: 'collections', action: 'cancel', ref: c.xreceiptno, message: `Cancelled receipt ${c.xreceiptno} (${money(c.xtotal)} BDT)` })
    toast('Receipt cancelled', 'warn')
  }

  return (
    <div className="page">
      <PageHeader back={{ to: '/collections', label: 'Collections' }}
        title={<span>Receipt <span className="mono">{c.xreceiptno}</span> <Badge>{c.xstatus}</Badge></span>}
        actions={<>
          {can('holding.collections.cancel') && c.xstatus === 'Received' && <button type="button" className="btn btn-ghost danger" onClick={() => setConfirm(true)}><Ban size={16} /> Cancel receipt</button>}
          <button type="button" className="btn btn-ghost" onClick={() => window.print()}><Printer size={16} /> Print</button>
        </>} />

      <section className={`card doc receipt ${c.xstatus === 'Cancelled' ? 'void' : ''}`}>
        <header className="doc-head">
          <Emblem size={44} />
          <div><h2>{biz.zorg}</h2><p>Holding Tax Money Receipt</p></div>
          <div className="doc-no"><span>Receipt no</span><strong className="mono">{c.xreceiptno}</strong><span>{fmtDate(c.xdate)}</span></div>
        </header>
        <div className="doc-grid">
          <KV items={[
            ['Received from', tp?.xowner], ['Tax code', <Link className="link mono" to={`/taxpayers/${bill?.xtaxcode}`}>{bill?.xtaxcode}</Link>],
            ['Address', <span className="bn">{tp?.xaddress}</span>], ['Against bill', <Link className="link mono" to={`/bills/${c.xbillno}`}>{c.xbillno}</Link>],
            ['Period', bill && `${bill.xfyear}, paid up to Q${c.xupto_quarter}`],
          ]} />
          <KV items={[
            ['Payment mode', c.xpaymode], ['Bank', c.xbank && `${c.xbank}${c.xbranch ? `, ${c.xbranch}` : ''}`], ['Account', c.xaccount],
            ['Transaction ref', c.xtrnref], ['Voucher', c.xvoucher], ['Recorded by', `${c.zemail} · ${fmtTs(c.ztime)}`],
          ]} />
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Item</th><th className="num">Amount (BDT)</th></tr></thead>
            <tbody>
              <tr><td>Current tax (Q{bill?.xquarter}–Q{c.xupto_quarter})</td><td className="num">{money(c.xcurrent)}</td></tr>
              <tr><td>Less: rebate</td><td className="num">{c.xrebate ? `−${money(c.xrebate)}` : '0.00'}</td></tr>
              <tr><td>Arrear</td><td className="num">{money(c.xarrear)}</td></tr>
              <tr><td>Surcharge</td><td className="num">{money(c.xsurcharge)}</td></tr>
            </tbody>
            <tfoot><tr><td>Total received</td><td className="num big">{money(c.xtotal)}</td></tr></tfoot>
          </table>
        </div>
        <p className="in-words"><strong>In words:</strong> {c.xamount_words}</p>
        {c.xstatus === 'Cancelled' && <div className="void-stamp">CANCELLED</div>}
      </section>

      {confirm && <Confirm title="Cancel this receipt?" danger confirmLabel="Cancel receipt" onConfirm={cancel} onClose={() => setConfirm(false)}
        message={`${c.xreceiptno} for ${money(c.xtotal)} BDT will be marked Cancelled and bill ${c.xbillno} will be open for payment again.`} />}
    </div>
  )
}
