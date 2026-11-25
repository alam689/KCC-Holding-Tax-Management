import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Check, Search, Wallet } from 'lucide-react'
import { useData } from '../../data/store.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { Badge, Card, Empty, Field, KV, NoAccess, PageHeader, Select, useToast } from '../../components/ui.jsx'
import { OPEN_BILL, amountInWords, billDue, fmtDate, makeCollection, money, today } from '../../data/tax.js'

export default function NewCollection() {
  const { db, commit } = useData()
  const { can, user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [billno, setBillno] = useState(params.get('bill') || '')
  const [q, setQ] = useState('')
  const [upto, setUpto] = useState(params.get('upto') ? Number(params.get('upto')) : null)
  const [form, setForm] = useState({ date: today(), paymode: 'Bank', bank: '', branch: '', account: '', trnref: '', voucher: '' })
  const [errors, setErrors] = useState({})

  const openBills = useMemo(() => db.geo_holding_bill.filter((b) => OPEN_BILL.includes(b.xstatus)).map((b) => ({ ...b, _tp: db.geo_holding_taxpayer.find((t) => t.xtaxcode === b.xtaxcode) })), [db])
  const matches = useMemo(() => {
    const s = q.trim().toLowerCase()
    return s ? openBills.filter((b) => `${b.xbillno} ${b.xtaxcode} ${b._tp?.xowner} ${b._tp?.xmobile}`.toLowerCase().includes(s)).slice(0, 8) : []
  }, [q, openBills])

  if (!can('holding.collections.create')) return <NoAccess />
  const bill = db.geo_holding_bill.find((b) => b.xbillno === billno)
  const tp = bill && db.geo_holding_taxpayer.find((t) => t.xtaxcode === bill.xtaxcode)
  const opts = bill ? db.geo_holding_billopt.filter((o) => o.xbillno === bill.xbillno).sort((a, b) => a.xupto_quarter - b.xupto_quarter) : []
  const chosen = opts.find((o) => o.xupto_quarter === (upto ?? bill?.xquarter))
  const payable = bill && OPEN_BILL.includes(bill.xstatus)
  const set = (p) => { setForm((f) => ({ ...f, ...p })); setErrors({}) }

  function submit(e) {
    e.preventDefault()
    const errs = {}
    if (!form.date) errs.date = 'Required'
    if (form.date > today()) errs.date = 'Cannot be in the future'
    if (form.paymode === 'Bank' && !form.bank) errs.bank = 'Choose the bank'
    if ((form.paymode === 'Bank' || form.paymode === 'Mobile') && !form.trnref.trim()) errs.trnref = 'Enter the transaction reference'
    setErrors(errs)
    if (Object.keys(errs).length) return
    const c = makeCollection(db, { bill, upto: chosen.xupto_quarter, ...form, actor: user.zemail })
    commit((d) => {
      d.geo_holding_collection.push(c)
      d.geo_holding_bill = d.geo_holding_bill.map((b) => (b.xbillno === bill.xbillno ? { ...b, xstatus: 'Paid', zutime: c.ztime } : b))
    }, { module: 'collections', action: 'create', ref: c.xreceiptno, path: `/collections/${c.xreceiptno}`, message: `Received ${money(c.xtotal)} BDT from ${tp?.xowner} (${bill.xtaxcode}), receipt ${c.xreceiptno}` })
    toast(`Receipt ${c.xreceiptno} saved`)
    navigate(`/collections/${c.xreceiptno}`, { replace: true })
  }

  return (
    <div className="page">
      <PageHeader back={{ to: '/collections', label: 'Collections' }} title="New Collection" subtitle="Record a payment against an open bill and issue a receipt." />

      <Card icon={Search} title="1. Find the bill">
        {bill ? (
          <div className="picked">
            <div>
              <strong className="mono">{bill.xbillno}</strong> <Badge>{bill.xstatus}</Badge>
              <div className="muted small">{tp?.xowner} · <span className="mono">{bill.xtaxcode}</span> · {bill.xfyear} Q{bill.xquarter} · due {fmtDate(bill.xlastdate)}</div>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setBillno(''); setUpto(null) }}>Change</button>
          </div>
        ) : (
          <>
            <div className="search search-lg">
              <Search size={16} />
              <input className="input" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type bill no, tax code, owner name or mobile" />
            </div>
            {q && (matches.length ? (
              <ul className="pick-list">
                {matches.map((b) => (
                  <li key={b.xbillno}>
                    <button type="button" onClick={() => { setBillno(b.xbillno); setUpto(null); setQ('') }}>
                      <span><strong className="mono">{b.xbillno}</strong> · {b._tp?.xowner}<small className="muted mono"> {b.xtaxcode}</small></span>
                      <span className="num">{money(billDue(b))} BDT</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="muted small">No open bill matches “{q}”.</p>)}
            <p className="muted small">{openBills.length} bills are open for payment.</p>
          </>
        )}
      </Card>

      {bill && !payable && <Card><Empty title={`This bill is ${bill.xstatus}`}>Only Issued or Partial bills can be paid. {bill.xstatus === 'Carried' && 'Its amount was carried into a later bill — collect against that one.'}</Empty></Card>}

      {bill && payable && (
        <form onSubmit={submit} noValidate>
          <Card icon={Wallet} title="2. Choose how much to pay">
            <div className="opt-grid">
              {opts.map((o) => {
                const active = chosen?.xupto_quarter === o.xupto_quarter
                return (
                  <button type="button" key={o.xupto_quarter} className={`opt ${active ? 'active' : ''}`} onClick={() => setUpto(o.xupto_quarter)} aria-pressed={active}>
                    {active && <Check size={14} className="opt-check" />}
                    <span className="opt-label">Up to Q{o.xupto_quarter}</span>
                    <strong>{money(o.xtotal)}</strong>
                    <small className="muted">{o.xrebate ? `includes ${money(o.xrebate)} rebate` : o.xarrear ? `incl. ${money(o.xarrear + o.xsurcharge)} arrear` : 'BDT'}</small>
                  </button>
                )
              })}
            </div>
            {chosen && <KV items={[['Current', money(chosen.xcurrent)], ['Rebate', chosen.xrebate ? `−${money(chosen.xrebate)}` : '0.00'], ['Arrear', money(chosen.xarrear)], ['Surcharge', money(chosen.xsurcharge)], ['Total', <strong>{money(chosen.xtotal)} BDT</strong>], ['In words', amountInWords(chosen.xtotal)]]} />}
          </Card>

          <Card title="3. Payment details" footer={<>
            <span>Saving marks the bill Paid and issues receipt.</span>
            <button type="submit" className="btn btn-primary" disabled={!chosen}><Check size={16} /> Save receipt · {chosen ? money(chosen.xtotal) : ''} BDT</button>
          </>}>
            <div className="form-grid">
              <Field label="Payment date" required error={errors.date}><input className="input" type="date" value={form.date} max={today()} onChange={(e) => set({ date: e.target.value })} /></Field>
              <Field label="Payment mode" required><Select value={form.paymode} onChange={(v) => set({ paymode: v })} options={db.xcodes.filter((c) => c.xtype === 'PayMode').map((c) => [c.xcode, c.xdescdet || c.xcode])} /></Field>
              {form.paymode === 'Bank' && <>
                <Field label="Bank" required error={errors.bank}><Select value={form.bank} onChange={(v) => set({ bank: v })} options={db.xcodes.filter((c) => c.xtype === 'Bank').map((c) => c.xcode)} placeholder="Select bank…" /></Field>
                <Field label="Branch"><input className="input" value={form.branch} onChange={(e) => set({ branch: e.target.value })} /></Field>
                <Field label="Account"><input className="input" value={form.account} onChange={(e) => set({ account: e.target.value })} /></Field>
              </>}
              {form.paymode !== 'Cash' && <Field label="Transaction reference" required error={errors.trnref}><input className="input" value={form.trnref} onChange={(e) => set({ trnref: e.target.value })} /></Field>}
              <Field label="Voucher no"><input className="input" value={form.voucher} onChange={(e) => set({ voucher: e.target.value })} /></Field>
            </div>
          </Card>
        </form>
      )}
    </div>
  )
}
