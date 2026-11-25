import { useNavigate } from 'react-router-dom'
import CrudPage from '../../components/CrudPage.jsx'
import { Badge } from '../../components/ui.jsx'
import { OPEN_BILL, billDue, money, num } from '../../data/tax.js'
import { taxpayerBlockDelete, taxpayerDefaults, taxpayerFields, taxpayerFromForm, taxpayerToForm, taxpayerValidate } from './taxpayerForm.jsx'

export const TP_PERMS = { view: 'holding.taxpayers.view', create: 'holding.taxpayers.manage', update: 'holding.taxpayers.manage', delete: 'holding.taxpayers.manage' }

export default function Taxpayers() {
  const navigate = useNavigate()
  return (
    <CrudPage
      title="Taxpayers" subtitle="Assessed holdings. Each has a tax code built from ward, road, holding and extension."
      entity="taxpayer" table="geo_holding_taxpayer" module="taxpayers" perms={TP_PERMS} formSize="lg"
      rowKey={(r) => r.xtaxcode} describe={(r) => `${r.xtaxcode} (${r.xowner})`}
      searchText={(r) => `${r.xtaxcode} ${r.xowner} ${r.xownerbn} ${r.xmobile} ${r.xnid} ${r.xhousename}`}
      filters={[
        { key: 'ward', label: 'All wards', options: (db) => db.geo_ward.map((w) => [String(w.xwardid), w.xwardname]), test: (r, v) => r.xwardid === Number(v) },
        { key: 'use', label: 'All uses', options: (db) => db.xcodes.filter((c) => c.xtype === 'PropUse').map((c) => c.xcode), test: (r, v) => r.xpropuse === v },
        { key: 'due', label: 'Any balance', options: () => [['due', 'Has dues'], ['clear', 'No dues']], test: (r, v) => (v === 'due' ? r._due > 0 : r._due === 0) },
        { key: 'status', label: 'All statuses', options: () => ['Active', 'Inactive'], test: (r, v) => r.xstatus === v },
      ]}
      rows={(db) => db.geo_holding_taxpayer.map((t) => ({
        ...t, _due: db.geo_holding_bill.filter((b) => b.xtaxcode === t.xtaxcode && OPEN_BILL.includes(b.xstatus)).reduce((s, b) => s + billDue(b), 0),
      }))}
      columns={[
        { key: 'xtaxcode', label: 'Tax code', className: 'mono' },
        { key: 'xowner', label: 'Owner' },
        { key: 'xhousename', label: 'House' },
        { key: 'xproptype', label: 'Type', className: 'bn' },
        { key: 'xpropuse', label: 'Use', className: 'bn' },
        { key: 'xarea', label: 'Area', num: true, render: (r) => (r.xarea ? num(r.xarea) : '—') },
        { key: 'xannual_value', label: 'Annual value', num: true, render: (r) => money(r.xannual_value) },
        { key: '_due', label: 'Due now', num: true, render: (r) => (r._due ? <strong className="text-danger">{money(r._due)}</strong> : <span className="muted">0.00</span>) },
        { key: 'xstatus', label: 'Status', render: (r) => <Badge>{r.xstatus}</Badge> },
      ]}
      fields={taxpayerFields}
      defaults={taxpayerDefaults}
      toForm={taxpayerToForm}
      fromForm={taxpayerFromForm}
      validate={taxpayerValidate}
      blockDelete={taxpayerBlockDelete}
      onRowClick={(r) => navigate(`/taxpayers/${r.xtaxcode}`)}
    />
  )
}
