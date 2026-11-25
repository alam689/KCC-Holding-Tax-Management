import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import CrudPage from '../../components/CrudPage.jsx'
import ReviewModal, { nextNo } from '../../components/ReviewModal.jsx'
import { Badge, KV, useToast } from '../../components/ui.jsx'
import { useData } from '../../data/store.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { OPEN_BILL, billDue, fiscalYearOf, fmtDate, fyShort, money, nowTs, policy, today } from '../../data/tax.js'

const duesOf = (db, taxcode) => db.geo_holding_bill.filter((b) => b.xtaxcode === taxcode && OPEN_BILL.includes(b.xstatus)).reduce((s, b) => s + billDue(b), 0)

// geo_ownership_transfer (front-end table): mutation of a holding to a new owner.
// Approval needs all dues cleared; it then rewrites the owner on the taxpayer and the building.
export default function Transfer() {
  const { db, commit } = useData()
  const { can, user } = useAuth()
  const toast = useToast()
  const [review, setReview] = useState(null)
  const pol = policy(db)

  function decide(t, xstatus, remarks) {
    const ts = nowTs()
    commit((d) => {
      d.geo_ownership_transfer = d.geo_ownership_transfer.map((x) => (x.xtransferno === t.xtransferno ? { ...x, xstatus, xapproved_by: user.zemail, xapproved_at: ts, xremarks: remarks || x.xremarks, zutime: ts } : x))
      if (xstatus !== 'Approved') return
      const owner = {
        xowner: t.xto_owner, xownerbn: t.xto_ownerbn, xguardian: t.xto_guardian, xspouse: t.xto_spouse,
        xmobile: t.xto_mobile, xnid: t.xto_nid, xemail: t.xto_email, zutime: ts, zemail: user.zemail,
      }
      const tp = d.geo_holding_taxpayer.find((x) => x.xtaxcode === t.xtaxcode)
      d.geo_holding_taxpayer = d.geo_holding_taxpayer.map((x) => (x.xtaxcode === t.xtaxcode ? { ...x, ...owner } : x))
      // The building record follows the main (extension 00) holding.
      if (tp && tp.xholdext === '00') d.geo_building = d.geo_building.map((b) => (b.xwardid === tp.xwardid && b.xroadid === tp.xroadid && b.xholdid === tp.xholdid
        ? { ...b, xowner: t.xto_owner, xownerbn: t.xto_ownerbn, xowner_parent: t.xto_guardian, xowner_spouse: t.xto_spouse, xmobile: t.xto_mobile, zutime: ts, zemail: user.zemail } : b))
    }, {
      module: 'transfer', action: xstatus === 'Approved' ? 'approve' : 'cancel', ref: t.xtransferno, path: `/taxpayers/${t.xtaxcode}`,
      message: xstatus === 'Approved' ? `Ownership of ${t.xtaxcode} transferred from ${t.xfrom_owner} to ${t.xto_owner} (${t.xtransferno})` : `Rejected transfer ${t.xtransferno} (${t.xtaxcode})`,
    })
    toast(xstatus === 'Approved' ? 'Ownership transferred' : 'Transfer rejected')
  }

  return (
    <>
      <CrudPage
        title="Ownership Transfer" subtitle="Mutation of a holding to a new owner after sale, inheritance or gift. All dues must be cleared before approval."
        entity="transfer" table="geo_ownership_transfer" module="transfer" formSize="lg" initialSort={{ key: 'xtransferno', dir: 'desc' }}
        perms={{ view: 'holding.transfer.view', create: 'holding.transfer.manage', update: 'holding.transfer.manage', delete: 'holding.transfer.manage' }}
        rowKey={(r) => r.xtransferno} describe={(r) => `${r.xtransferno} (${r.xtaxcode})`}
        searchText={(r) => `${r.xtransferno} ${r.xtaxcode} ${r.xfrom_owner} ${r.xto_owner} ${r.xdeedno}`}
        canEditRow={(r) => r.xstatus === 'Pending'} canDeleteRow={(r) => r.xstatus === 'Pending'}
        filters={[
          { key: 'status', label: 'All statuses', options: () => ['Pending', 'Approved', 'Rejected'], test: (r, v) => r.xstatus === v },
          { key: 'type', label: 'All types', options: (d) => d.xcodes.filter((c) => c.xtype === 'TransferType').map((c) => c.xcode), test: (r, v) => r.xtype === v },
        ]}
        rows={(d) => d.geo_ownership_transfer.map((t) => ({ ...t, _due: t.xstatus === 'Pending' ? duesOf(d, t.xtaxcode) : 0 }))}
        columns={[
          { key: 'xtransferno', label: 'Transfer', className: 'mono' },
          { key: 'xdate', label: 'Applied', render: (r) => fmtDate(r.xdate) },
          { key: 'xtaxcode', label: 'Tax code', className: 'mono' },
          { key: 'xtype', label: 'Type' },
          { key: 'xfrom_owner', label: 'From' },
          { key: 'xto_owner', label: 'To', render: (r) => <strong>{r.xto_owner}</strong> },
          { key: 'xdeedno', label: 'Deed', render: (r) => <>{r.xdeedno}<div className="muted small">{fmtDate(r.xdeeddate)}</div></> },
          { key: '_due', label: 'Dues', num: true, render: (r) => (r._due ? <span className="text-danger">{money(r._due)}</span> : r.xstatus === 'Pending' ? <span className="text-ok">Clear</span> : '—') },
          { key: 'xstatus', label: 'Status', render: (r) => <Badge tone={{ Pending: 'warn', Approved: 'ok', Rejected: 'danger' }[r.xstatus]}>{r.xstatus}</Badge> },
        ]}
        rowActions={(r) => r.xstatus === 'Pending' && can('holding.transfer.approve') && (
          <button type="button" className="icon-btn" title="Approve or reject" aria-label="Review" onClick={() => setReview(r)}><CheckCircle2 size={15} /></button>
        )}
        fields={[
          { name: 'xtransferno', label: 'Transfer no', type: 'display', render: (f) => <span className="mono">{f.xtransferno}</span> },
          { name: 'xdate', label: 'Application date', type: 'date', required: true },
          { name: 'xtaxcode', label: 'Holding', type: 'select', required: true, lockOnEdit: true, options: (f, d) => d.geo_holding_taxpayer.filter((t) => t.xstatus === 'Active').map((t) => [t.xtaxcode, `${t.xtaxcode} · ${t.xowner}`]) },
          {
            name: '_cur', label: 'Current owner', type: 'display', render: (f, d) => {
              const t = d.geo_holding_taxpayer.find((x) => x.xtaxcode === f.xtaxcode)
              if (!t) return '—'
              const due = duesOf(d, t.xtaxcode)
              return <span>{t.xowner} <span className="bn muted">{t.xownerbn}</span> · {due ? <span className="text-danger">{money(due)} BDT due</span> : <span className="text-ok">no dues</span>}</span>
            },
          },
          { name: 'xtype', label: 'Transfer type', type: 'select', required: true, options: (f, d) => d.xcodes.filter((c) => c.xtype === 'TransferType').map((c) => [c.xcode, c.xdescdet || c.xcode]) },
          { name: 'xdeedno', label: 'Deed / document no', required: true },
          { name: 'xdeeddate', label: 'Deed date', type: 'date', required: true },
          { name: 'xregistry', label: 'Registry office' },
          { name: 'xto_owner', label: 'New owner name', required: true },
          { name: 'xto_ownerbn', label: 'New owner name (Bangla)' },
          { name: 'xto_guardian', label: "Father's / mother's name" },
          { name: 'xto_spouse', label: 'Spouse name' },
          { name: 'xto_mobile', label: 'Mobile' },
          { name: 'xto_nid', label: 'NID', required: true },
          { name: 'xto_email', label: 'Email', type: 'email' },
          { name: 'xfee', label: 'Mutation fee (BDT)', type: 'number', min: 0, required: true },
          { name: 'xremarks', label: 'Remarks', type: 'textarea', span: 2 },
        ]}
        defaults={(d) => ({
          xtransferno: nextNo(d.geo_ownership_transfer, 'xtransferno', `OT-${fyShort(fiscalYearOf())}-`), xdate: today(), xtaxcode: '', xtype: 'Sale',
          xdeedno: '', xdeeddate: '', xregistry: '', xto_owner: '', xto_ownerbn: '', xto_guardian: '', xto_spouse: '', xto_mobile: '', xto_nid: '', xto_email: '', xfee: pol.mutationFee, xremarks: '',
        })}
        toForm={(r) => ({ ...r })}
        fromForm={(f, isNew, d, orig) => {
          const s = (v) => (v === '' || v == null ? null : String(v).trim())
          const t = d.geo_holding_taxpayer.find((x) => x.xtaxcode === f.xtaxcode)
          return {
            xtransferno: f.xtransferno, xtaxcode: f.xtaxcode, xdate: f.xdate, xtype: f.xtype, xdeedno: f.xdeedno.trim(), xdeeddate: f.xdeeddate, xregistry: s(f.xregistry),
            xfrom_owner: orig ? orig.xfrom_owner : t?.xowner, xfrom_ownerbn: orig ? orig.xfrom_ownerbn : t?.xownerbn,
            xto_owner: f.xto_owner.trim(), xto_ownerbn: s(f.xto_ownerbn), xto_guardian: s(f.xto_guardian), xto_spouse: s(f.xto_spouse), xto_mobile: s(f.xto_mobile),
            xto_nid: s(f.xto_nid), xto_email: s(f.xto_email), xfee: Number(f.xfee) || 0, xstatus: 'Pending', xapproved_by: null, xapproved_at: null, xremarks: f.xremarks || '',
          }
        }}
        validate={(f, isNew, d) => {
          const e = {}
          if (f.xdeeddate && f.xdeeddate > today()) e.xdeeddate = 'Cannot be in the future'
          if (f.xto_mobile && !/^01\d{9}$/.test(f.xto_mobile)) e.xto_mobile = 'Use an 11-digit number starting 01'
          if (f.xto_nid && !/^\d{10}$|^\d{13}$|^\d{17}$/.test(f.xto_nid)) e.xto_nid = 'NID is 10, 13 or 17 digits'
          const cur = d.geo_holding_taxpayer.find((x) => x.xtaxcode === f.xtaxcode)
          if (cur && cur.xowner.trim().toLowerCase() === (f.xto_owner || '').trim().toLowerCase()) e.xto_owner = 'Same as the current owner'
          if (isNew && d.geo_ownership_transfer.some((x) => x.xtaxcode === f.xtaxcode && x.xstatus === 'Pending')) e.xtaxcode = 'A transfer for this holding is already pending'
          return e
        }}
      />
      {review && (() => {
        const due = duesOf(db, review.xtaxcode)
        return (
          <ReviewModal
            title={`Review transfer ${review.xtransferno}`}
            blockReason={due > 0 ? `${money(due)} BDT is still due on ${review.xtaxcode}. Collect it before approving.` : null}
            summary={<KV items={[
              ['Holding', review.xtaxcode], ['Type', review.xtype], ['Deed', `${review.xdeedno} · ${fmtDate(review.xdeeddate)}`],
              ['From', review.xfrom_owner], ['To', <strong>{review.xto_owner}</strong>], ['NID', review.xto_nid], ['Fee', `${money(review.xfee)} BDT`],
            ]} />}
            onApprove={(rm) => decide(review, 'Approved', rm)} onReject={(rm) => decide(review, 'Rejected', rm)} onClose={() => setReview(null)}
          />
        )
      })()}
    </>
  )
}
