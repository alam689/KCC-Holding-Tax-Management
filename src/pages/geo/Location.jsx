import CrudPage from '../../components/CrudPage.jsx'

const P = { view: 'geo.location.view', create: 'geo.location.manage', update: 'geo.location.manage', delete: 'geo.location.manage' }
const thanaOpts = (db) => db.geo_thana.map((t) => [String(t.xthanaid), t.xthana])
const wardOpts = (db, thana) => db.geo_ward.filter((w) => !thana || w.xthanaid === Number(thana)).map((w) => [String(w.xwardid), w.xwardname])

// geo_thana — PK (zid, xthanaid)
export function Thanas() {
  return (
    <CrudPage
      title="Thana" subtitle="Police-station areas. Wards sit under a thana." entity="thana" table="geo_thana" module="geo" perms={P}
      rowKey={(r) => r.xthanaid} describe={(r) => r.xthana}
      columns={[
        { key: 'xthanaid', label: 'ID', num: true },
        { key: 'xthana', label: 'Thana' },
        { key: 'xdesc', label: 'Description', className: 'bn' },
        { key: 'wards', label: 'Wards', num: true, sort: (r) => r._w, render: (r) => r._w },
      ]}
      rows={(db) => db.geo_thana.map((t) => ({ ...t, _w: db.geo_ward.filter((w) => w.xthanaid === t.xthanaid).length }))}
      fields={[
        { name: 'xthanaid', label: 'Thana ID', type: 'number', required: true, lockOnEdit: true, min: 1 },
        { name: 'xthana', label: 'Thana name', required: true },
        { name: 'xdesc', label: 'Description (Bangla)', required: true, span: 2 },
      ]}
      defaults={(db) => ({ xthanaid: Math.max(0, ...db.geo_thana.map((t) => t.xthanaid)) + 1, xthana: '', xdesc: '' })}
      fromForm={({ xthanaid, xthana, xdesc }) => ({ xthanaid: Number(xthanaid), xthana: xthana.trim(), xdesc: xdesc.trim() })}
      validate={(f, isNew, db) => (isNew && db.geo_thana.some((t) => t.xthanaid === Number(f.xthanaid)) ? { xthanaid: 'This ID is already used' } : null)}
      blockDelete={(r, db) => (db.geo_ward.some((w) => w.xthanaid === r.xthanaid) ? `${r.xthana} still has wards. Delete or move them first.` : null)}
    />
  )
}

// geo_ward — PK (zid, xthanaid, xwardid), FK → geo_thana
export function Wards() {
  return (
    <CrudPage
      title="Wards" subtitle="City corporation wards, each under a thana." entity="ward" table="geo_ward" module="geo" perms={P}
      rowKey={(r) => `${r.xthanaid}-${r.xwardid}`} describe={(r) => r.xwardname}
      filters={[{ key: 'thana', label: 'All thanas', options: thanaOpts, test: (r, v) => r.xthanaid === Number(v) }]}
      rows={(db) => db.geo_ward.map((w) => ({
        ...w, _thana: db.geo_thana.find((t) => t.xthanaid === w.xthanaid)?.xthana,
        _roads: db.geo_road.filter((r) => r.xthanaid === w.xthanaid && r.xwardid === w.xwardid).length,
        _hold: db.geo_holding_taxpayer.filter((t) => t.xwardid === w.xwardid).length,
      }))}
      columns={[
        { key: 'xwardid', label: 'Ward', num: true },
        { key: 'xwardname', label: 'Name' },
        { key: 'xdesc', label: 'Description', className: 'bn' },
        { key: '_thana', label: 'Thana' },
        { key: '_roads', label: 'Roads', num: true },
        { key: '_hold', label: 'Holdings', num: true },
      ]}
      fields={[
        { name: 'xthanaid', label: 'Thana', type: 'select', required: true, lockOnEdit: true, options: (f, db) => thanaOpts(db) },
        { name: 'xwardid', label: 'Ward number', type: 'number', required: true, lockOnEdit: true, min: 1 },
        { name: 'xwardname', label: 'Ward name', required: true },
        { name: 'xdesc', label: 'Description (Bangla)', required: true },
      ]}
      defaults={(db) => ({ xthanaid: String(db.geo_thana[0]?.xthanaid ?? ''), xwardid: Math.max(0, ...db.geo_ward.map((w) => w.xwardid)) + 1, xwardname: '', xdesc: '' })}
      toForm={(r) => ({ ...r, xthanaid: String(r.xthanaid) })}
      fromForm={(f) => ({ xthanaid: Number(f.xthanaid), xwardid: Number(f.xwardid), xwardname: f.xwardname.trim(), xdesc: f.xdesc.trim() })}
      validate={(f, isNew, db) => (isNew && db.geo_ward.some((w) => w.xthanaid === Number(f.xthanaid) && w.xwardid === Number(f.xwardid)) ? { xwardid: 'This ward already exists in the thana' } : null)}
      blockDelete={(r, db) => (db.geo_road.some((x) => x.xthanaid === r.xthanaid && x.xwardid === r.xwardid) ? `${r.xwardname} still has roads. Delete them first.` : null)}
    />
  )
}

// geo_road — PK (zid, xthanaid, xwardid, xroadid), FK → geo_ward
export function Roads() {
  return (
    <CrudPage
      title="Roads" subtitle="Roads within each ward. The road code forms part of the tax code." entity="road" table="geo_road" module="geo" perms={P}
      rowKey={(r) => `${r.xthanaid}-${r.xwardid}-${r.xroadid}`} describe={(r) => `${r.xroadid} (${r.xdesc || r.xroadname})`}
      searchText={(r) => `${r.xroadid} ${r.xroadname} ${r.xdesc}`}
      filters={[{ key: 'ward', label: 'All wards', options: (db) => wardOpts(db), test: (r, v) => r.xwardid === Number(v) }]}
      rows={(db) => db.geo_road.map((r) => ({
        ...r, _b: db.geo_building.filter((b) => b.xwardid === r.xwardid && b.xroadid === r.xroadid).length,
      }))}
      columns={[
        { key: 'xwardid', label: 'Ward', num: true, render: (r) => String(r.xwardid).padStart(2, '0') },
        { key: 'xroadid', label: 'Road code', num: true, render: (r) => String(r.xroadid).padStart(3, '0') },
        { key: 'xroadname', label: 'Road name', className: 'bn' },
        { key: 'xdesc', label: 'Description' },
        { key: '_b', label: 'Buildings', num: true },
      ]}
      fields={[
        { name: 'xthanaid', label: 'Thana', type: 'select', required: true, lockOnEdit: true, options: (f, db) => thanaOpts(db), onChange: () => ({ xwardid: '' }) },
        { name: 'xwardid', label: 'Ward', type: 'select', required: true, lockOnEdit: true, options: (f, db) => wardOpts(db, f.xthanaid) },
        { name: 'xroadid', label: 'Road code', type: 'number', required: true, lockOnEdit: true, min: 1, hint: 'Up to 3 digits, e.g. 13 → 013' },
        { name: 'xroadname', label: 'Road name (Bangla)', required: true },
        { name: 'xdesc', label: 'Description (English)', required: true, span: 2 },
      ]}
      defaults={(db) => ({ xthanaid: String(db.geo_thana[0]?.xthanaid ?? ''), xwardid: '', xroadid: '', xroadname: '', xdesc: '' })}
      toForm={(r) => ({ ...r, xthanaid: String(r.xthanaid), xwardid: String(r.xwardid) })}
      fromForm={(f) => ({ xthanaid: Number(f.xthanaid), xwardid: Number(f.xwardid), xroadid: Number(f.xroadid), xroadname: f.xroadname.trim(), xdesc: f.xdesc.trim() })}
      validate={(f, isNew, db) => {
        if (Number(f.xroadid) > 999) return { xroadid: 'Road code must be 3 digits or fewer' }
        if (isNew && db.geo_road.some((r) => r.xthanaid === Number(f.xthanaid) && r.xwardid === Number(f.xwardid) && r.xroadid === Number(f.xroadid))) return { xroadid: 'This road code already exists in the ward' }
        return null
      }}
      blockDelete={(r, db) => (db.geo_building.some((b) => b.xthanaid === r.xthanaid && b.xwardid === r.xwardid && b.xroadid === r.xroadid) ? 'This road still has buildings. Delete them first.' : null)}
    />
  )
}
