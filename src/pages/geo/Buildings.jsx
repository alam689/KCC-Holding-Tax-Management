import CrudPage from '../../components/CrudPage.jsx'
import { Badge } from '../../components/ui.jsx'
import { num } from '../../data/tax.js'

const P = { view: 'geo.buildings.view', create: 'geo.buildings.manage', update: 'geo.buildings.manage', delete: 'geo.buildings.manage' }
const codeOpts = (db, type) => db.xcodes.filter((c) => c.xtype === type && c.zactive !== '0').map((c) => [c.xcode, c.xdescdet ? `${c.xcode} · ${c.xdescdet}` : c.xcode])
const key = (r) => `${r.xthanaid}-${r.xwardid}-${r.xroadid}-${r.xholdid}`

// geo_building — PK (zid, xthanaid, xwardid, xroadid, xholdid), FK → geo_road
export default function Buildings() {
  return (
    <CrudPage
      title="Buildings" subtitle="Physical structures on each road. Taxpayers (holdings) are assessed against a building."
      entity="building" table="geo_building" module="buildings" perms={P} formSize="lg"
      rowKey={key} describe={(r) => `${r.xholdname} (W${r.xwardid}/R${r.xroadid}/${r.xholdid})`}
      searchText={(r) => `${r.xholdid} ${r.xholdname} ${r.xowner} ${r.xownerbn} ${r.xmobile}`}
      filters={[
        { key: 'ward', label: 'All wards', options: (db) => db.geo_ward.map((w) => [String(w.xwardid), w.xwardname]), test: (r, v) => r.xwardid === Number(v) },
        { key: 'stype', label: 'All structures', options: (db) => codeOpts(db, 'PropType'), test: (r, v) => r.xstype === v },
        { key: 'status', label: 'All statuses', options: () => ['Active', 'Pending', 'Inactive'], test: (r, v) => r.xstatus === v },
      ]}
      rows={(db) => db.geo_building.map((b) => ({
        ...b, _tp: db.geo_holding_taxpayer.filter((t) => t.xwardid === b.xwardid && t.xroadid === b.xroadid && t.xholdid === b.xholdid).length,
        _road: db.geo_road.find((r) => r.xwardid === b.xwardid && r.xroadid === b.xroadid)?.xdesc,
      }))}
      columns={[
        { key: 'xwardid', label: 'Ward', num: true, render: (r) => String(r.xwardid).padStart(2, '0') },
        { key: '_road', label: 'Road' },
        { key: 'xholdid', label: 'Holding #', num: true },
        { key: 'xholdname', label: 'Name' },
        { key: 'xtype', label: 'Type' },
        { key: 'xstype', label: 'Structure', className: 'bn' },
        { key: 'xflr_count', label: 'Floors', num: true },
        { key: 'xarea', label: 'Area (sqft)', num: true, render: (r) => num(r.xarea) },
        { key: 'xowner', label: 'Owner' },
        { key: '_tp', label: 'Holdings', num: true },
        { key: 'xstatus', label: 'Status', render: (r) => <Badge>{r.xstatus}</Badge> },
      ]}
      fields={[
        { name: 'xthanaid', label: 'Thana', type: 'select', required: true, lockOnEdit: true, options: (f, db) => db.geo_thana.map((t) => [String(t.xthanaid), t.xthana]), onChange: () => ({ xwardid: '', xroadid: '' }) },
        { name: 'xwardid', label: 'Ward', type: 'select', required: true, lockOnEdit: true, options: (f, db) => db.geo_ward.filter((w) => w.xthanaid === Number(f.xthanaid)).map((w) => [String(w.xwardid), w.xwardname]), onChange: () => ({ xroadid: '' }) },
        { name: 'xroadid', label: 'Road', type: 'select', required: true, lockOnEdit: true, options: (f, db) => db.geo_road.filter((r) => r.xthanaid === Number(f.xthanaid) && r.xwardid === Number(f.xwardid)).map((r) => [String(r.xroadid), `${String(r.xroadid).padStart(3, '0')} · ${r.xdesc}`]) },
        { name: 'xholdid', label: 'Holding number', type: 'number', required: true, lockOnEdit: true, min: 1 },
        { name: 'xholdname', label: 'Building / house name', required: true },
        { name: 'xtype', label: 'Building type', type: 'select', options: () => ['Main', 'Subsidiary'] },
        { name: 'xstype', label: 'Structure type', type: 'select', options: (f, db) => codeOpts(db, 'PropType') },
        { name: 'xflr_count', label: 'Floors', type: 'number', min: 0 },
        { name: 'xarea', label: 'Area (sqft)', type: 'number', min: 0, step: '0.01' },
        { name: 'xusage', label: 'Functional use', type: 'select', options: (f, db) => codeOpts(db, 'PropUse') },
        { name: 'xcatbuild', label: 'Building category' },
        { name: 'xstatus', label: 'Status', type: 'select', options: () => ['Active', 'Pending', 'Inactive'] },
        { name: 'xowner', label: 'Owner name', },
        { name: 'xownerbn', label: 'Owner name (Bangla)' },
        { name: 'xowner_parent', label: "Father's / mother's name" },
        { name: 'xowner_spouse', label: 'Spouse name' },
        { name: 'xmobile', label: 'Mobile' },
        { name: 'xemail', label: 'Email', type: 'email' },
        { name: 'xlatitude', label: 'Latitude', type: 'number', step: 'any' },
        { name: 'xlongitude', label: 'Longitude', type: 'number', step: 'any' },
      ]}
      defaults={(db) => ({ xthanaid: String(db.geo_thana[0]?.xthanaid ?? ''), xwardid: '', xroadid: '', xholdid: '', xholdname: '', xtype: 'Main', xstype: '', xflr_count: 1, xarea: '', xusage: '', xcatbuild: '', xstatus: 'Active', xowner: '', xownerbn: '', xowner_parent: '', xowner_spouse: '', xmobile: '', xemail: '', xlatitude: '', xlongitude: '' })}
      toForm={(r) => ({ ...r, xthanaid: String(r.xthanaid), xwardid: String(r.xwardid), xroadid: String(r.xroadid) })}
      fromForm={(f) => {
        const n = (v) => (v === '' || v === null || v === undefined ? null : Number(v))
        const s = (v) => (v === '' || v === undefined ? null : String(v).trim())
        return {
          xthanaid: Number(f.xthanaid), xwardid: Number(f.xwardid), xroadid: Number(f.xroadid), xholdid: Number(f.xholdid),
          xholdname: f.xholdname.trim(), xtype: s(f.xtype), xstype: s(f.xstype), xflr_count: n(f.xflr_count), xarea: n(f.xarea),
          xusage: s(f.xusage), xcatbuild: s(f.xcatbuild), xowner: s(f.xowner), xownerbn: s(f.xownerbn), xowner_parent: s(f.xowner_parent),
          xowner_spouse: s(f.xowner_spouse), xmobile: s(f.xmobile), xstatus: s(f.xstatus), xemail: s(f.xemail), xlatitude: n(f.xlatitude), xlongitude: n(f.xlongitude),
        }
      }}
      validate={(f, isNew, db) => (isNew && db.geo_building.some((b) => key(b) === `${f.xthanaid}-${f.xwardid}-${f.xroadid}-${f.xholdid}`) ? { xholdid: 'A building with this holding number already exists on the road' } : null)}
      blockDelete={(r, db) => (db.geo_holding_taxpayer.some((t) => t.xthanaid === r.xthanaid && t.xwardid === r.xwardid && t.xroadid === r.xroadid && t.xholdid === r.xholdid) ? 'Taxpayers are assessed against this building. Remove them first.' : null)}
    />
  )
}
