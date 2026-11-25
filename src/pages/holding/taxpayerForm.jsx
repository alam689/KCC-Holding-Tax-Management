// Shared form definition for geo_holding_taxpayer (used by the list and the detail screen).
// PK (zid, xtaxcode); UNIQUE (zid, xwardid, xroadid, xholdid, xholdext);
// FK (zid, xthanaid, xwardid, xroadid, xholdid) → geo_building. When "building not found" is ticked,
// xthanaid is stored as NULL, which is how the database lets a holding exist without a surveyed building.

const p = (n, w) => String(n ?? '').padStart(w, '0')
export const taxCodeOf = (f) => (f.xwardid && f.xroadid && f.xholdid !== '' && f.xholdid !== undefined
  ? `${p(f.xwardid, 2)}-${p(f.xroadid, 3)}-${p(f.xholdid, 4)}-${(f.xholdext || '00').toUpperCase()}` : '—')

const codeOpts = (db, type) => db.xcodes.filter((c) => c.xtype === type && c.zactive !== '0').map((c) => [c.xcode, c.xdescdet ? `${c.xcode} · ${c.xdescdet}` : c.xcode])

export const taxpayerFields = [
  { name: 'xwardid', label: 'Ward', type: 'select', required: true, lockOnEdit: true, options: (f, db) => db.geo_ward.map((w) => [String(w.xwardid), w.xwardname]), onChange: () => ({ xroadid: '', xholdid: '' }) },
  { name: 'xroadid', label: 'Road', type: 'select', required: true, lockOnEdit: true, options: (f, db) => db.geo_road.filter((r) => r.xwardid === Number(f.xwardid)).map((r) => [String(r.xroadid), `${p(r.xroadid, 3)} · ${r.xdesc}`]), onChange: () => ({ xholdid: '' }) },
  { name: 'xbuilding_notfound', label: 'Building', type: 'checkbox', checkLabel: 'Building not found in survey', lockOnEdit: true, onChange: () => ({ xholdid: '' }) },
  {
    name: 'xholdid', label: 'Holding (building)', type: 'select', required: true, lockOnEdit: true, show: (f) => !f.xbuilding_notfound,
    options: (f, db) => db.geo_building.filter((b) => b.xwardid === Number(f.xwardid) && b.xroadid === Number(f.xroadid)).map((b) => [String(b.xholdid), `${b.xholdid} · ${b.xholdname}`]),
    onChange: (v, f, db) => {
      const b = db.geo_building.find((x) => x.xwardid === Number(f.xwardid) && x.xroadid === Number(f.xroadid) && x.xholdid === Number(v))
      return b ? { xhousename: f.xhousename || b.xholdname, xowner: f.xowner || b.xowner || '', xownerbn: f.xownerbn || b.xownerbn || '', xarea: f.xarea || b.xarea || '', xproptype: f.xproptype || b.xstype || '', xpropuse: f.xpropuse || b.xusage || '' } : {}
    },
  },
  { name: 'xholdid', label: 'Holding number', type: 'number', required: true, lockOnEdit: true, min: 0, show: (f) => !!f.xbuilding_notfound },
  { name: 'xholdext', label: 'Holding extension', required: true, lockOnEdit: true, hint: 'Usually 00; use 01, 02… for flats or shares' },
  { name: '_code', label: 'Tax code', type: 'display', render: (f) => <strong className="mono">{taxCodeOf(f)}</strong> },
  { name: 'xhousename', label: 'House name' },
  { name: 'xaddress', label: 'Address', type: 'textarea', span: 2 },
  { name: 'xowner', label: 'Owner / taxpayer name', required: true },
  { name: 'xownerbn', label: 'Owner name (Bangla)' },
  { name: 'xguardian', label: "Father's / mother's name" },
  { name: 'xspouse', label: 'Spouse name' },
  { name: 'xmobile', label: 'Mobile' },
  { name: 'xnid', label: 'NID' },
  { name: 'xemail', label: 'Email', type: 'email' },
  { name: 'xarea', label: 'Area (sqft)', type: 'number', min: 0, step: '0.01' },
  { name: 'xproptype', label: 'Property type', type: 'select', options: (f, db) => codeOpts(db, 'PropType') },
  { name: 'xpropuse', label: 'Property use', type: 'select', options: (f, db) => codeOpts(db, 'PropUse') },
  { name: 'xtaxpayertype', label: 'Taxpayer type', type: 'select', options: (f, db) => codeOpts(db, 'TaxpayerType') },
  { name: 'xannual_value', label: 'Annual value (BDT)', type: 'number', required: true, min: 0, step: '0.01', hint: 'Assessed annual rental value; tax components are a % of this' },
  { name: 'xstatus', label: 'Status', type: 'select', required: true, options: () => ['Active', 'Inactive'] },
]

export const taxpayerDefaults = () => ({
  xwardid: '', xroadid: '', xbuilding_notfound: false, xholdid: '', xholdext: '00', xhousename: '', xaddress: '', xowner: '', xownerbn: '',
  xguardian: '', xspouse: '', xmobile: '', xnid: '', xemail: '', xarea: '', xproptype: '', xpropuse: '', xtaxpayertype: 'প্রাইভেট', xannual_value: '', xstatus: 'Active',
})

export const taxpayerToForm = (r) => ({ ...r, xwardid: String(r.xwardid), xroadid: String(r.xroadid), xholdid: r.xbuilding_notfound ? r.xholdid : String(r.xholdid) })

export function taxpayerFromForm(f, isNew, db) {
  const s = (v) => (v === '' || v === undefined || v === null ? null : String(v).trim())
  const ward = db.geo_ward.find((w) => w.xwardid === Number(f.xwardid))
  const road = db.geo_road.find((r) => r.xwardid === Number(f.xwardid) && r.xroadid === Number(f.xroadid))
  return {
    xtaxcode: taxCodeOf(f), xthanaid: f.xbuilding_notfound ? null : ward?.xthanaid ?? null,
    xwardid: Number(f.xwardid), xroadid: Number(f.xroadid), xholdid: Number(f.xholdid), xholdext: (f.xholdext || '00').toUpperCase(),
    xbuilding_notfound: !!f.xbuilding_notfound, xroadname: road?.xroadname ?? '', xhousename: s(f.xhousename), xaddress: s(f.xaddress),
    xowner: f.xowner.trim(), xownerbn: s(f.xownerbn), xguardian: s(f.xguardian), xspouse: s(f.xspouse), xmobile: s(f.xmobile), xnid: s(f.xnid),
    xemail: s(f.xemail), xarea: f.xarea === '' ? null : Number(f.xarea), xproptype: s(f.xproptype), xpropuse: s(f.xpropuse),
    xtaxpayertype: s(f.xtaxpayertype), xannual_value: Number(f.xannual_value) || 0, xstatus: f.xstatus,
  }
}

export function taxpayerValidate(f, isNew, db) {
  const e = {}
  if (!/^[0-9A-Za-z]{1,4}$/.test(f.xholdext || '')) e.xholdext = 'Letters or digits, up to 4'
  if (Number(f.xholdid) > 9999) e.xholdid = 'Holding number must be 4 digits or fewer'
  if (Number(f.xannual_value) < 0) e.xannual_value = 'Cannot be negative'
  if (f.xmobile && !/^01\d{9}$/.test(f.xmobile)) e.xmobile = 'Use an 11-digit number starting 01'
  if (isNew) {
    const code = taxCodeOf(f)
    if (db.geo_holding_taxpayer.some((t) => t.xtaxcode === code)) e.xholdext = `Tax code ${code} already exists`
    else if (db.geo_holding_taxpayer.some((t) => t.xwardid === Number(f.xwardid) && t.xroadid === Number(f.xroadid) && t.xholdid === Number(f.xholdid) && t.xholdext === (f.xholdext || '00').toUpperCase())) e.xholdext = 'This holding and extension is already registered'
  }
  return e
}

export const taxpayerBlockDelete = (r, db) => (db.geo_holding_bill.some((b) => b.xtaxcode === r.xtaxcode) ? 'Bills exist for this taxpayer. Set the status to Inactive instead.' : null)
