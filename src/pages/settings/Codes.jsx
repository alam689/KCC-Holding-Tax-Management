import CrudPage from '../../components/CrudPage.jsx'
import { Badge } from '../../components/ui.jsx'

const TYPE_HELP = {
  TaxComponent: 'Value = rate % of annual value; Alt code = Bangla name',
  Policy: 'Value = number (percent)',
}

// xcodes — PK (zid, xtype, xcode). Lookup lists used across the app.
export default function Codes() {
  return (
    <CrudPage
      title="Codes" subtitle="Lookup lists: tax components and rates, billing policy, property types, payment modes, banks and more."
      entity="code" table="xcodes" module="settings"
      perms={{ view: 'settings.system_config.view', create: 'settings.system_config.update', update: 'settings.system_config.update', delete: 'settings.system_config.update' }}
      rowKey={(r) => `${r.xtype}|${r.xcode}`} describe={(r) => `${r.xtype} ${r.xcode}`} pageSize={20}
      searchText={(r) => `${r.xtype} ${r.xcode} ${r.xdescdet} ${r.xcodealt}`}
      filters={[{ key: 'type', label: 'All types', options: (db) => [...new Set(db.xcodes.map((c) => c.xtype))].sort(), test: (r, v) => r.xtype === v }]}
      columns={[
        { key: 'xtype', label: 'Type' },
        { key: 'xcode', label: 'Code', className: 'bn' },
        { key: 'xdescdet', label: 'Description' },
        { key: 'xprops', label: 'Value', num: true },
        { key: 'xcodealt', label: 'Alt code', className: 'bn' },
        { key: 'zactive', label: 'Status', render: (r) => <Badge tone={r.zactive === '0' ? 'muted' : 'ok'}>{r.zactive === '0' ? 'Inactive' : 'Active'}</Badge> },
      ]}
      fields={[
        { name: 'xtype', label: 'Type', required: true, lockOnEdit: true, hint: 'e.g. TaxComponent, Policy, PropType, Bank' },
        { name: 'xcode', label: 'Code', required: true, lockOnEdit: true },
        { name: 'xdescdet', label: 'Description', span: 2 },
        { name: 'xprops', label: 'Value', hint: '' },
        { name: 'xcodealt', label: 'Alt code' },
        { name: 'xteam', label: 'Team' },
        { name: 'zactive', label: 'Status', type: 'select', options: () => [['1', 'Active'], ['0', 'Inactive']] },
      ].map((f) => (f.name === 'xprops' ? { ...f, hint: undefined } : f))}
      defaults={() => ({ xtype: '', xcode: '', xdescdet: '', xprops: '', xcodealt: '', xteam: '', zactive: '1' })}
      fromForm={(f) => ({ xtype: f.xtype.trim(), xcode: f.xcode.trim(), xdescdet: f.xdescdet?.trim() ?? '', xprops: String(f.xprops ?? '').trim(), xcodealt: f.xcodealt?.trim() ?? '', xteam: f.xteam?.trim() ?? '', zactive: f.zactive })}
      validate={(f, isNew, db) => {
        const e = {}
        if (isNew && db.xcodes.some((c) => c.xtype === f.xtype.trim() && c.xcode === f.xcode.trim())) e.xcode = 'This code already exists for the type'
        if (TYPE_HELP[f.xtype] && f.xprops !== '' && isNaN(Number(f.xprops))) e.xprops = 'Must be a number'
        if (f.xtype === 'TaxComponent' && (f.xprops === '' || Number(f.xprops) < 0 || Number(f.xprops) > 100)) e.xprops = 'Rate must be between 0 and 100'
        return e
      }}
      blockDelete={(r, db) => {
        if (r.xtype === 'Policy') return 'Policy codes are required by billing. Edit the value instead.'
        if (r.xtype === 'PropType' && db.geo_holding_taxpayer.some((t) => t.xproptype === r.xcode)) return 'Taxpayers use this property type. Set it Inactive instead.'
        if (r.xtype === 'PropUse' && db.geo_holding_taxpayer.some((t) => t.xpropuse === r.xcode)) return 'Taxpayers use this property use. Set it Inactive instead.'
        return null
      }}
    />
  )
}
