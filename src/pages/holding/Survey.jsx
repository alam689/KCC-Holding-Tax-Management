import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calculator, CheckCircle2, Send } from 'lucide-react'
import CrudPage from '../../components/CrudPage.jsx'
import ReviewModal, { nextNo } from '../../components/ReviewModal.jsx'
import { Badge, KV, useToast } from '../../components/ui.jsx'
import { useData } from '../../data/store.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { fiscalYearOf, fmtDate, fyShort, money, num, nowTs, today, ZID } from '../../data/tax.js'

const p = (n, w) => String(n).padStart(w, '0')
const codeOpts = (db, type) => db.xcodes.filter((c) => c.xtype === type && c.zactive !== '0').map((c) => [c.xcode, c.xdescdet ? `${c.xcode} · ${c.xdescdet}` : c.xcode])
const buildingAt = (db, f) => db.geo_building.find((b) => b.xwardid === Number(f.xwardid) && b.xroadid === Number(f.xroadid) && b.xholdid === Number(f.xholdid))

// geo_survey (front-end table): a field visit to a holding. Verifying it updates the building
// registry — or adds the building if the surveyor found one that wasn't registered.
export default function Survey() {
  const { db, commit } = useData()
  const { can, user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [review, setReview] = useState(null)

  function setStatus(s, xstatus, remarks) {
    const ts = nowTs()
    commit((d) => {
      d.geo_survey = d.geo_survey.map((x) => (x.xsurveyno === s.xsurveyno ? {
        ...x, xstatus, zutime: ts, zemail: user.zemail,
        ...(xstatus === 'Verified' || xstatus === 'Rejected' ? { xverified_by: user.zemail, xverified_at: ts } : {}),
        ...(remarks ? { xremarks: remarks } : {}),
      } : x))
      if (xstatus !== 'Verified') return
      const b = buildingAt(d, s)
      if (b) {
        d.geo_building = d.geo_building.map((x) => (x === b ? { ...x, xflr_count: s.xflr_count ?? x.xflr_count, xarea: s.xarea ?? x.xarea, xstype: s.xstructure || x.xstype, xusage: s.xusage || x.xusage, zutime: ts, zemail: user.zemail } : x))
      } else {
        const ward = d.geo_ward.find((w) => w.xwardid === s.xwardid)
        d.geo_building.push({
          zid: ZID, xthanaid: ward?.xthanaid ?? 1, xwardid: s.xwardid, xroadid: s.xroadid, xholdid: s.xholdid, xholdname: `Holding ${p(s.xholdid, 4)}`,
          xtype: 'Main', xstype: s.xstructure, xflr_count: s.xflr_count, xarea: s.xarea, xusage: s.xusage, xcatbuild: '', xowner: s.xowner || null,
          xownerbn: null, xowner_parent: null, xowner_spouse: null, xmobile: null, xstatus: 'Pending', xemail: null,
          xlatitude: s.xlatitude, xlongitude: s.xlongitude, ztime: ts, zutime: ts, zemail: user.zemail,
        })
      }
    }, {
      module: 'survey', action: xstatus === 'Verified' ? 'approve' : xstatus === 'Rejected' ? 'cancel' : 'update', ref: s.xsurveyno,
      message: `${xstatus} survey ${s.xsurveyno} (W${s.xwardid}/R${s.xroadid}/${s.xholdid})${xstatus === 'Verified' && !buildingAt(db, s) ? ' — new building added to registry' : ''}`,
    })
    toast(`Survey ${xstatus.toLowerCase()}`)
  }

  return (
    <>
      <CrudPage
        title="Field Survey" subtitle="Record what surveyors find on site. Verified surveys update the building registry and feed assessments."
        entity="survey" table="geo_survey" module="survey" formSize="lg" initialSort={{ key: 'xsurveyno', dir: 'desc' }}
        perms={{ view: 'holding.survey.view', create: 'holding.survey.manage', update: 'holding.survey.manage', delete: 'holding.survey.manage' }}
        rowKey={(r) => r.xsurveyno} describe={(r) => `${r.xsurveyno} (W${r.xwardid}/R${r.xroadid}/${r.xholdid})`}
        searchText={(r) => `${r.xsurveyno} ${r.xtaxcode} ${r.xholdid} ${r.xsurveyor} ${r.xremarks}`}
        canEditRow={(r) => ['Draft', 'Submitted'].includes(r.xstatus)} canDeleteRow={(r) => r.xstatus === 'Draft'}
        filters={[
          { key: 'status', label: 'All statuses', options: () => ['Draft', 'Submitted', 'Verified', 'Rejected'], test: (r, v) => r.xstatus === v },
          { key: 'ward', label: 'All wards', options: (db) => db.geo_ward.map((w) => [String(w.xwardid), w.xwardname]), test: (r, v) => r.xwardid === Number(v) },
        ]}
        columns={[
          { key: 'xsurveyno', label: 'Survey no', className: 'mono' },
          { key: 'xdate', label: 'Date', render: (r) => fmtDate(r.xdate) },
          { key: 'loc', label: 'Ward / road / holding', sort: (r) => `${p(r.xwardid, 2)}${p(r.xroadid, 3)}${p(r.xholdid, 4)}`, render: (r) => `${p(r.xwardid, 2)} / ${p(r.xroadid, 3)} / ${r.xholdid}` },
          { key: 'xtaxcode', label: 'Tax code', className: 'mono', render: (r) => r.xtaxcode || <span className="muted">Not assessed</span> },
          { key: 'xstructure', label: 'Structure', className: 'bn' },
          { key: 'xflr_count', label: 'Floors', num: true },
          { key: 'xarea', label: 'Area', num: true, render: (r) => num(r.xarea) },
          { key: 'xoccupancy', label: 'Occupancy' },
          { key: 'xmonthly_rent', label: 'Rent / month', num: true, render: (r) => (r.xmonthly_rent ? money(r.xmonthly_rent) : '—') },
          { key: 'xstatus', label: 'Status', render: (r) => <Badge tone={{ Draft: 'muted', Submitted: 'warn', Verified: 'ok', Rejected: 'danger' }[r.xstatus]}>{r.xstatus}</Badge> },
        ]}
        rowActions={(r) => <>
          {r.xstatus === 'Draft' && can('holding.survey.manage') && <button type="button" className="icon-btn" title="Submit for verification" aria-label="Submit" onClick={() => setStatus(r, 'Submitted')}><Send size={15} /></button>}
          {r.xstatus === 'Submitted' && can('holding.survey.verify') && <button type="button" className="icon-btn" title="Verify or reject" aria-label="Review" onClick={() => setReview(r)}><CheckCircle2 size={15} /></button>}
          {r.xstatus === 'Verified' && r.xtaxcode && can('holding.assessment.manage') && <button type="button" className="icon-btn" title="Start assessment from this survey" aria-label="Assess" onClick={() => navigate(`/assessment?survey=${r.xsurveyno}`)}><Calculator size={15} /></button>}
        </>}
        fields={[
          { name: 'xsurveyno', label: 'Survey no', type: 'display', render: (f) => <span className="mono">{f.xsurveyno}</span> },
          { name: 'xdate', label: 'Survey date', type: 'date', required: true },
          { name: 'xwardid', label: 'Ward', type: 'select', required: true, options: (f, db) => db.geo_ward.map((w) => [String(w.xwardid), w.xwardname]), onChange: () => ({ xroadid: '', xtaxcode: '' }) },
          { name: 'xroadid', label: 'Road', type: 'select', required: true, options: (f, db) => db.geo_road.filter((r) => r.xwardid === Number(f.xwardid)).map((r) => [String(r.xroadid), `${p(r.xroadid, 3)} · ${r.xdesc}`]), onChange: () => ({ xtaxcode: '' }) },
          { name: 'xholdid', label: 'Holding number', type: 'number', required: true, min: 1 },
          { name: '_bld', label: 'Building registry', type: 'display', render: (f, db) => { const b = f.xholdid && buildingAt(db, f); return b ? `${b.xholdname} · ${b.xflr_count ?? '?'} floors · ${num(b.xarea)} sqft` : f.xholdid ? <span className="text-warn">Not registered — verifying will add it</span> : '—' } },
          { name: 'xtaxcode', label: 'Taxpayer (if assessed)', type: 'select', placeholder: 'None yet', options: (f, db) => db.geo_holding_taxpayer.filter((t) => t.xwardid === Number(f.xwardid) && t.xroadid === Number(f.xroadid) && t.xholdid === Number(f.xholdid)).map((t) => [t.xtaxcode, `${t.xtaxcode} · ${t.xowner}`]) },
          { name: 'xowner', label: 'Owner name (as found)' },
          { name: 'xstructure', label: 'Structure', type: 'select', required: true, options: (f, db) => codeOpts(db, 'PropType') },
          { name: 'xusage', label: 'Use', type: 'select', required: true, options: (f, db) => codeOpts(db, 'PropUse') },
          { name: 'xflr_count', label: 'Floors', type: 'number', required: true, min: 0 },
          { name: 'xarea', label: 'Total floor area (sqft)', type: 'number', required: true, min: 0, step: '0.01' },
          { name: 'xoccupancy', label: 'Occupancy', type: 'select', required: true, options: (f, db) => codeOpts(db, 'Occupancy') },
          { name: 'xrented_area', label: 'Rented area (sqft)', type: 'number', min: 0, show: (f) => f.xoccupancy && f.xoccupancy !== 'Owner' },
          { name: 'xmonthly_rent', label: 'Monthly rent found (BDT)', type: 'number', min: 0, step: '0.01', hint: 'Actual or estimated rental value per month' },
          { name: 'xlatitude', label: 'Latitude', type: 'number', step: 'any' },
          { name: 'xlongitude', label: 'Longitude', type: 'number', step: 'any' },
          { name: 'xremarks', label: 'Remarks', type: 'textarea', span: 2 },
          { name: 'xstatus', label: 'Save as', type: 'select', required: true, options: () => [['Draft', 'Draft (keep editing)'], ['Submitted', 'Submit for verification']] },
        ]}
        defaults={(db) => ({
          xsurveyno: nextNo(db.geo_survey, 'xsurveyno', `SV-${fyShort(fiscalYearOf())}-`), xdate: today(), xwardid: '', xroadid: '', xholdid: '', xtaxcode: '', xowner: '',
          xstructure: '', xusage: '', xflr_count: 1, xarea: '', xoccupancy: 'Owner', xrented_area: '', xmonthly_rent: '', xlatitude: '', xlongitude: '', xremarks: '', xstatus: 'Draft',
        })}
        toForm={(r) => ({ ...r, xwardid: String(r.xwardid), xroadid: String(r.xroadid), xtaxcode: r.xtaxcode || '' })}
        fromForm={(f, isNew, db) => {
          const n = (v) => (v === '' || v == null ? null : Number(v))
          return {
            xsurveyno: f.xsurveyno, xdate: f.xdate, xsurveyor: isNew ? user.zemail : f.xsurveyor, xthanaid: db.geo_ward.find((w) => w.xwardid === Number(f.xwardid))?.xthanaid ?? 1,
            xwardid: Number(f.xwardid), xroadid: Number(f.xroadid), xholdid: Number(f.xholdid), xtaxcode: f.xtaxcode || null, xowner: f.xowner || null,
            xstructure: f.xstructure, xusage: f.xusage, xflr_count: n(f.xflr_count), xarea: n(f.xarea), xoccupancy: f.xoccupancy,
            xrented_area: f.xoccupancy === 'Owner' ? 0 : n(f.xrented_area), xmonthly_rent: n(f.xmonthly_rent), xlatitude: n(f.xlatitude), xlongitude: n(f.xlongitude),
            xremarks: f.xremarks || '', xstatus: f.xstatus, xverified_by: null, xverified_at: null,
          }
        }}
        validate={(f) => {
          const e = {}
          if (f.xdate > today()) e.xdate = 'Cannot be in the future'
          if (Number(f.xrented_area) > Number(f.xarea)) e.xrented_area = 'Cannot exceed total area'
          if (f.xoccupancy !== 'Owner' && !f.xmonthly_rent) e.xmonthly_rent = 'Enter the rent for a rented property'
          return e
        }}
      />
      {review && (
        <ReviewModal
          title={`Review survey ${review.xsurveyno}`} approveLabel="Verify"
          summary={<KV items={[
            ['Location', `Ward ${p(review.xwardid, 2)} · road ${p(review.xroadid, 3)} · holding ${review.xholdid}`],
            ['Found', `${review.xstructure}, ${review.xflr_count} floors, ${num(review.xarea)} sqft, ${review.xoccupancy}`],
            ['Monthly rent', review.xmonthly_rent ? `${money(review.xmonthly_rent)} BDT` : '—'],
            ['Surveyor', review.xsurveyor], ['Remarks', review.xremarks],
          ]} />}
          onApprove={(rm) => setStatus(review, 'Verified', rm)}
          onReject={(rm) => setStatus(review, 'Rejected', rm)}
          onClose={() => setReview(null)}
        />
      )}
    </>
  )
}
