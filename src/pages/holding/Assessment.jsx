import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import CrudPage from '../../components/CrudPage.jsx'
import ReviewModal, { nextNo } from '../../components/ReviewModal.jsx'
import { Badge, KV, useToast } from '../../components/ui.jsx'
import { useData } from '../../data/store.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { assessValue, fiscalYearOf, fiscalYears, fmtDate, fyShort, money, nowTs, policy, round2, today, totalRate } from '../../data/tax.js'

const change = (from, to) => (from ? round2(((to - from) / from) * 100) : null)
const Delta = ({ from, to }) => {
  const c = change(from, to)
  if (c === null) return '—'
  return <span className={c > 0 ? 'text-danger' : c < 0 ? 'text-ok' : 'muted'}>{c > 0 ? '+' : ''}{c}%</span>
}

// geo_assessment (front-end table): valuation of a holding's annual value.
// Annual value = monthly rental value × (12 − repair months). Approving it updates the taxpayer's
// xannual_value, which every later bill is calculated from.
export default function Assessment() {
  const { db, commit } = useData()
  const { can, user } = useAuth()
  const toast = useToast()
  const [params] = useSearchParams()
  const [review, setReview] = useState(null)
  const pol = policy(db)
  const rate = totalRate(db)

  const startNew = useMemo(() => {
    const s = db.geo_survey.find((x) => x.xsurveyno === params.get('survey'))
    if (!s) return null
    return {
      xtaxcode: s.xtaxcode || '', xsurveyno: s.xsurveyno, xmethod: s.xmonthly_rent ? 'Rental' : 'Area rate',
      xmonthly_rent: s.xmonthly_rent ?? '', xarea: s.xarea ?? '', xremarks: `From survey ${s.xsurveyno}`,
    }
  }, [params]) // eslint-disable-line react-hooks/exhaustive-deps

  function decide(a, xstatus, remarks) {
    const ts = nowTs()
    commit((d) => {
      d.geo_assessment = d.geo_assessment.map((x) => (x.xassessno === a.xassessno ? { ...x, xstatus, xapproved_by: user.zemail, xapproved_at: ts, xremarks: remarks || x.xremarks, zutime: ts } : x))
      if (xstatus === 'Approved') d.geo_holding_taxpayer = d.geo_holding_taxpayer.map((t) => (t.xtaxcode === a.xtaxcode ? { ...t, xannual_value: a.xannual_value, zutime: ts, zemail: user.zemail } : t))
    }, {
      module: 'assessment', action: xstatus === 'Approved' ? 'approve' : 'cancel', ref: a.xassessno, path: `/taxpayers/${a.xtaxcode}`,
      message: xstatus === 'Approved' ? `Approved assessment ${a.xassessno}: ${a.xtaxcode} annual value ${money(a.xprev_annual_value)} → ${money(a.xannual_value)}` : `Rejected assessment ${a.xassessno} (${a.xtaxcode})`,
    })
    toast(`Assessment ${xstatus.toLowerCase()}`)
  }

  const calc = (f) => assessValue(f)

  return (
    <>
      <CrudPage
        title="Assessment" subtitle={`Set each holding's annual value. Annual value = monthly rental value × (12 − ${pol.repairMonths} repair months). Approved values drive future bills.`}
        entity="assessment" table="geo_assessment" module="assessment" formSize="lg" startNew={startNew} initialSort={{ key: 'xassessno', dir: 'desc' }}
        perms={{ view: 'holding.assessment.view', create: 'holding.assessment.manage', update: 'holding.assessment.manage', delete: 'holding.assessment.manage' }}
        rowKey={(r) => r.xassessno} describe={(r) => `${r.xassessno} (${r.xtaxcode})`}
        searchText={(r) => `${r.xassessno} ${r.xtaxcode} ${r._owner} ${r.xsurveyno}`}
        canEditRow={(r) => r.xstatus === 'Draft'} canDeleteRow={(r) => r.xstatus === 'Draft'}
        rows={(d) => d.geo_assessment.map((a) => ({ ...a, _owner: d.geo_holding_taxpayer.find((t) => t.xtaxcode === a.xtaxcode)?.xowner }))}
        filters={[
          { key: 'status', label: 'All statuses', options: () => ['Draft', 'Approved', 'Rejected'], test: (r, v) => r.xstatus === v },
          { key: 'fy', label: 'All years', options: (d) => [...new Set(d.geo_assessment.map((a) => a.xeffective_fyear))], test: (r, v) => r.xeffective_fyear === v },
        ]}
        columns={[
          { key: 'xassessno', label: 'Assessment', className: 'mono' },
          { key: 'xdate', label: 'Date', render: (r) => fmtDate(r.xdate) },
          { key: 'xtaxcode', label: 'Taxpayer', render: (r) => <>{r._owner}<div className="muted small mono">{r.xtaxcode}</div></> },
          { key: 'xmethod', label: 'Method' },
          { key: 'xprev_annual_value', label: 'Previous AV', num: true, render: (r) => money(r.xprev_annual_value) },
          { key: 'xannual_value', label: 'New AV', num: true, render: (r) => <strong>{money(r.xannual_value)}</strong> },
          { key: 'chg', label: 'Change', num: true, sort: (r) => change(r.xprev_annual_value, r.xannual_value) ?? 0, render: (r) => <Delta from={r.xprev_annual_value} to={r.xannual_value} /> },
          { key: 'xeffective_fyear', label: 'Effective' },
          { key: 'xstatus', label: 'Status', render: (r) => <Badge tone={{ Draft: 'warn', Approved: 'ok', Rejected: 'danger' }[r.xstatus]}>{r.xstatus}</Badge> },
        ]}
        rowActions={(r) => r.xstatus === 'Draft' && can('holding.assessment.approve') && (
          <button type="button" className="icon-btn" title="Approve or reject" aria-label="Review" onClick={() => setReview(r)}><CheckCircle2 size={15} /></button>
        )}
        fields={[
          { name: 'xassessno', label: 'Assessment no', type: 'display', render: (f) => <span className="mono">{f.xassessno}</span> },
          { name: 'xdate', label: 'Date', type: 'date', required: true },
          {
            name: 'xtaxcode', label: 'Taxpayer', type: 'select', required: true, lockOnEdit: true,
            options: (f, d) => d.geo_holding_taxpayer.filter((t) => t.xstatus === 'Active').map((t) => [t.xtaxcode, `${t.xtaxcode} · ${t.xowner}`]),
            onChange: () => ({ xsurveyno: '' }),
          },
          {
            name: 'xsurveyno', label: 'Based on survey', type: 'select', placeholder: 'No survey',
            options: (f, d) => d.geo_survey.filter((s) => s.xstatus === 'Verified' && s.xtaxcode === f.xtaxcode).map((s) => [s.xsurveyno, `${s.xsurveyno} · ${fmtDate(s.xdate)}`]),
            onChange: (v, f, d) => {
              const s = d.geo_survey.find((x) => x.xsurveyno === v)
              return s ? { xarea: s.xarea ?? f.xarea, xmonthly_rent: s.xmonthly_rent ?? f.xmonthly_rent, xmethod: s.xmonthly_rent ? 'Rental' : 'Area rate' } : {}
            },
          },
          { name: 'xeffective_fyear', label: 'Effective from', type: 'select', required: true, options: () => fiscalYears(fiscalYearOf(), 1, 1) },
          { name: 'xmethod', label: 'Method', type: 'select', required: true, options: () => [['Rental', 'Rental value (actual rent)'], ['Area rate', 'Area × standard rate']] },
          { name: 'xmonthly_rent', label: 'Monthly rent (BDT)', type: 'number', min: 0, step: '0.01', required: true, show: (f) => f.xmethod === 'Rental' },
          { name: 'xarea', label: 'Area (sqft)', type: 'number', min: 0, step: '0.01', required: true },
          { name: 'xrate_sqft', label: 'Rate per sqft per month (BDT)', type: 'number', min: 0, step: '0.01', required: true, show: (f) => f.xmethod === 'Area rate' },
          { name: 'xrepair_months', label: 'Repair allowance (months)', type: 'number', min: 0, max: 6, required: true },
          {
            name: '_calc', label: 'Valuation', type: 'display', span: 2, render: (f, d) => {
              const v = calc(f)
              const prev = d.geo_holding_taxpayer.find((t) => t.xtaxcode === f.xtaxcode)?.xannual_value
              return (
                <span className="calc-line">
                  <span>Monthly {money(v.monthly)}</span>
                  <span>× {12 - (Number(f.xrepair_months) || 0)} months</span>
                  <strong>= Annual value {money(v.annual)}</strong>
                  {prev !== undefined && <span className="muted">current {money(prev)} (<Delta from={prev} to={v.annual} />)</span>}
                  <span className="muted">≈ {money((v.annual * rate) / 100)} tax/year at {rate}%</span>
                </span>
              )
            },
          },
          { name: 'xremarks', label: 'Remarks', type: 'textarea', span: 2 },
        ]}
        defaults={(d) => ({
          xassessno: nextNo(d.geo_assessment, 'xassessno', `AS-${fyShort(fiscalYearOf())}-`), xdate: today(), xtaxcode: '', xsurveyno: '',
          xeffective_fyear: fiscalYearOf(), xmethod: 'Rental', xmonthly_rent: '', xarea: '', xrate_sqft: pol.rateSqft, xrepair_months: pol.repairMonths, xremarks: '',
        })}
        toForm={(r) => ({ ...r, xsurveyno: r.xsurveyno || '', xmonthly_rent: r.xmonthly_rent ?? '', xrate_sqft: r.xrate_sqft ?? pol.rateSqft })}
        fromForm={(f, isNew, d, orig) => {
          const v = calc(f)
          const n = (x) => (x === '' || x == null ? null : Number(x))
          return {
            xassessno: f.xassessno, xtaxcode: f.xtaxcode, xsurveyno: f.xsurveyno || null, xdate: f.xdate, xeffective_fyear: f.xeffective_fyear, xmethod: f.xmethod,
            xmonthly_rent: f.xmethod === 'Rental' ? n(f.xmonthly_rent) : null, xarea: n(f.xarea), xrate_sqft: f.xmethod === 'Area rate' ? n(f.xrate_sqft) : null,
            xrepair_months: Number(f.xrepair_months), xannual_value: v.annual,
            xprev_annual_value: orig ? orig.xprev_annual_value : d.geo_holding_taxpayer.find((t) => t.xtaxcode === f.xtaxcode)?.xannual_value ?? 0,
            xstatus: 'Draft', xapproved_by: null, xapproved_at: null, xremarks: f.xremarks || '',
          }
        }}
        validate={(f, isNew, d) => {
          const e = {}
          if (Number(f.xrepair_months) < 0 || Number(f.xrepair_months) > 6) e.xrepair_months = 'Between 0 and 6 months'
          if (!(calc(f).annual > 0)) e._calc = 'Annual value must be more than zero'
          if (isNew && d.geo_assessment.some((a) => a.xtaxcode === f.xtaxcode && a.xstatus === 'Draft')) e.xtaxcode = 'This taxpayer already has a draft assessment — finish that one first'
          return e
        }}
      />
      {review && (
        <ReviewModal
          title={`Review assessment ${review.xassessno}`}
          summary={<KV items={[
            ['Taxpayer', `${review._owner} (${review.xtaxcode})`],
            ['Method', review.xmethod === 'Rental' ? `Rent ${money(review.xmonthly_rent)}/month` : `${review.xarea} sqft × ${review.xrate_sqft}/sqft`],
            ['Annual value', <><strong>{money(review.xannual_value)}</strong> (was {money(review.xprev_annual_value)}, <Delta from={review.xprev_annual_value} to={review.xannual_value} />)</>],
            ['Effective', review.xeffective_fyear], ['Based on', review.xsurveyno || 'No survey'],
          ]} />}
          onApprove={(rm) => decide(review, 'Approved', rm)} onReject={(rm) => decide(review, 'Rejected', rm)} onClose={() => setReview(null)}
        />
      )}
    </>
  )
}
