import CrudPage from '../../components/CrudPage.jsx'
import { Badge } from '../../components/ui.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { fmtDate, today } from '../../data/tax.js'

// zxusers — PK (zid, zemail), FK (zid, xrole) → zxrole
export function Users() {
  const { user } = useAuth()
  return (
    <CrudPage
      title="Users" subtitle="Staff accounts. A user's permissions come from their role, plus any overrides."
      entity="user" table="zxusers" module="settings"
      perms={{ view: 'settings.users.view', create: 'settings.users.create', update: 'settings.users.update', delete: 'settings.users.delete' }}
      rowKey={(r) => r.zemail} describe={(r) => `${r.xname} (${r.zemail})`}
      searchText={(r) => `${r.zemail} ${r.xname} ${r.xmobile} ${r.xrole}`}
      filters={[
        { key: 'role', label: 'All roles', options: (db) => db.zxrole.map((r) => [r.xrole, r.xname]), test: (r, v) => r.xrole === v },
        { key: 'active', label: 'All', options: () => [['1', 'Active'], ['0', 'Inactive']], test: (r, v) => r.zactive === v },
      ]}
      rows={(db) => db.zxusers.map((u) => ({
        ...u, _role: db.zxrole.find((r) => r.xrole === u.xrole)?.xname ?? u.xrole,
        _ov: db.zxuserperm.filter((o) => o.zemail === u.zemail && !o.zrevokedat && (!o.dto || o.dto >= today())).length,
      }))}
      columns={[
        { key: 'xname', label: 'Name', render: (r) => <><strong>{r.xname}</strong>{r.zemail === user?.zemail && <span className="muted small"> (you)</span>}</> },
        { key: 'zemail', label: 'Email' },
        { key: '_role', label: 'Role' },
        { key: 'xmobile', label: 'Mobile' },
        { key: '_ov', label: 'Overrides', num: true },
        { key: 'ztime', label: 'Created', render: (r) => fmtDate(r.ztime) },
        { key: 'zactive', label: 'Status', render: (r) => <Badge tone={r.zactive === '1' ? 'ok' : 'muted'}>{r.zactive === '1' ? 'Active' : 'Inactive'}</Badge> },
      ]}
      fields={[
        { name: 'zemail', label: 'Email (login)', type: 'email', required: true, lockOnEdit: true },
        { name: 'xname', label: 'Full name', required: true },
        { name: 'xrole', label: 'Role', type: 'select', required: true, options: (f, db) => db.zxrole.filter((r) => r.zactive === 1).map((r) => [r.xrole, r.xname]) },
        { name: 'xmobile', label: 'Mobile' },
        { name: 'xphone', label: 'Phone' },
        { name: 'xlanguage', label: 'Language', type: 'select', options: () => [['en', 'English'], ['bn', 'বাংলা']] },
        { name: 'xpassword', label: 'Password', type: 'password', hint: 'Leave blank to keep the current password', placeholder: '••••••••' },
        { name: 'zactive', label: 'Status', type: 'select', required: true, options: () => [['1', 'Active'], ['0', 'Inactive']] },
      ]}
      defaults={() => ({ zemail: '', xname: '', xrole: '', xmobile: '', xphone: '', xlanguage: 'en', xpassword: '', zactive: '1' })}
      toForm={(r) => ({ ...r, xpassword: '' })}
      fromForm={(f, isNew, db, orig) => ({
        zemail: f.zemail.trim().toLowerCase(), xname: f.xname.trim(), xrole: f.xrole, xmobile: f.xmobile || null, xphone: f.xphone || null,
        xlanguage: f.xlanguage, zactive: f.zactive, xpassword: f.xpassword ? f.xpassword : orig?.xpassword ?? '', xaccess: orig?.xaccess ?? '',
      })}
      validate={(f, isNew, db, orig) => {
        const e = {}
        if (!/^\S+@\S+\.\S+$/.test(f.zemail || '')) e.zemail = 'Not a valid email'
        else if (isNew && db.zxusers.some((u) => u.zemail === f.zemail.trim().toLowerCase())) e.zemail = 'A user with this email already exists'
        if (isNew && !f.xpassword) e.xpassword = 'Set a password for the new user'
        if (f.xpassword && f.xpassword.length < 8) e.xpassword = 'At least 8 characters'
        if (orig && orig.zemail === user?.zemail && f.zactive !== '1') e.zactive = "You can't deactivate your own account"
        return e
      }}
      blockDelete={(r, db) => {
        if (r.zemail === user?.zemail) return "You can't delete your own account"
        if (db.zxuserperm.some((o) => o.zemail === r.zemail)) return 'This user has permission overrides. Remove them first, or set the user Inactive.'
        return null
      }}
    />
  )
}

// zxuserperm — PK (zid, zemail, xcode); FK → zxusers, zxperms
export function Overrides() {
  const { user } = useAuth()
  const state = (r) => (r.zrevokedat ? 'Revoked' : r.dto && r.dto < today() ? 'Expired' : r.dfrom > today() ? 'Scheduled' : 'Active')
  return (
    <CrudPage
      title="Permission Overrides" subtitle="Grant or deny one permission to one user, for a date range, on top of their role."
      entity="override" table="zxuserperm" module="settings" formSize="md"
      perms={{ view: 'settings.users.view', create: 'settings.users.override', update: 'settings.users.override', delete: 'settings.users.override' }}
      rowKey={(r) => `${r.zemail}|${r.xcode}`} describe={(r) => `${r.xeffect} ${r.xcode} for ${r.zemail}`}
      filters={[
        { key: 'user', label: 'All users', options: (db) => db.zxusers.map((u) => [u.zemail, u.xname]), test: (r, v) => r.zemail === v },
        { key: 'state', label: 'Any state', options: () => ['Active', 'Scheduled', 'Expired', 'Revoked'], test: (r, v) => state(r) === v },
      ]}
      columns={[
        { key: 'zemail', label: 'User' },
        { key: 'xcode', label: 'Permission', className: 'mono' },
        { key: 'xeffect', label: 'Effect', render: (r) => <Badge>{r.xeffect}</Badge> },
        { key: 'xreason', label: 'Reason' },
        { key: 'dfrom', label: 'From', render: (r) => fmtDate(r.dfrom) },
        { key: 'dto', label: 'To', render: (r) => (r.dto ? fmtDate(r.dto) : 'Open-ended') },
        { key: 'xgrantedby', label: 'By' },
        { key: 'state', label: 'State', sort: state, render: (r) => <Badge tone={{ Active: 'ok', Scheduled: 'info', Expired: 'muted', Revoked: 'muted' }[state(r)]}>{state(r)}</Badge> },
      ]}
      fields={[
        { name: 'zemail', label: 'User', type: 'select', required: true, lockOnEdit: true, options: (f, db) => db.zxusers.map((u) => [u.zemail, `${u.xname} (${u.zemail})`]) },
        { name: 'xcode', label: 'Permission', type: 'select', required: true, lockOnEdit: true, options: (f, db) => db.zxperms.filter((p) => p.zactive === 1).map((p) => [p.xcode, `${p.xcode} — ${p.xdesc}`]) },
        { name: 'xeffect', label: 'Effect', type: 'select', required: true, options: () => [['GRANT', 'Grant (allow)'], ['DENY', 'Deny (block)']] },
        { name: 'dfrom', label: 'From', type: 'date', required: true },
        { name: 'dto', label: 'To', type: 'date', hint: 'Leave blank for no end date' },
        { name: 'xreason', label: 'Reason', type: 'textarea', required: true, span: 2 },
        { name: 'revoked', label: 'Revoke', type: 'checkbox', checkLabel: 'Revoke this override now', show: (f) => !f._new },
      ]}
      defaults={() => ({ _new: true, zemail: '', xcode: '', xeffect: 'GRANT', dfrom: today(), dto: '', xreason: '' })}
      toForm={(r) => ({ ...r, dto: r.dto || '', revoked: !!r.zrevokedat })}
      fromForm={(f, isNew, db, orig) => ({
        zemail: f.zemail, xcode: f.xcode, xeffect: f.xeffect, xreason: f.xreason.trim(), dfrom: f.dfrom, dto: f.dto || null,
        xgrantedby: isNew ? user.zemail : orig.xgrantedby,
        zrevokedat: f.revoked ? orig?.zrevokedat || new Date().toISOString().slice(0, 19) : null,
        xrevokedby: f.revoked ? orig?.xrevokedby || user.zemail : null,
      })}
      validate={(f, isNew, db) => {
        const e = {}
        if (f.dto && f.dto < f.dfrom) e.dto = 'Must be on or after the start date'
        if (isNew && db.zxuserperm.some((o) => o.zemail === f.zemail && o.xcode === f.xcode)) e.xcode = 'This user already has an override for this permission — edit it instead'
        if (isNew && f.zemail === user?.zemail && f.xeffect === 'DENY' && f.xcode === 'settings.users.override') e.xeffect = "You can't remove your own override permission"
        return e
      }}
    />
  )
}
