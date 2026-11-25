import { useEffect, useMemo, useState } from 'react'
import { Plus, ShieldCheck, Trash2, Users as UsersIcon, Pencil } from 'lucide-react'
import { useData } from '../../data/store.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { Badge, Card, Confirm, Field, Modal, NoAccess, PageHeader, useToast } from '../../components/ui.jsx'
import { ZID, nowTs } from '../../data/tax.js'

// zxrole (PK zid, xrole) + zxroleperm (PK zid, xrole, xcode) against the zxperms catalogue.
export default function Roles() {
  const { db, commit } = useData()
  const { can, user } = useAuth()
  const toast = useToast()
  const [sel, setSel] = useState(db.zxrole[0]?.xrole)
  const [draft, setDraft] = useState(null) // Set of codes being edited
  const [form, setForm] = useState(null)
  const [errors, setErrors] = useState({})
  const [confirm, setConfirm] = useState(null)

  const role = db.zxrole.find((r) => r.xrole === sel)
  const granted = useMemo(() => new Set(db.zxroleperm.filter((rp) => rp.xrole === sel).map((rp) => rp.xcode)), [db.zxroleperm, sel])
  useEffect(() => setDraft(null), [sel])
  const groups = useMemo(() => {
    const g = {}
    db.zxperms.forEach((p) => { (g[`${p.xmodule}.${p.xresource}`] ||= []).push(p) })
    return Object.entries(g)
  }, [db.zxperms])

  if (!can('settings.roles.view')) return <NoAccess />
  const canEdit = can('settings.roles.update')
  const current = draft ?? granted
  const dirty = draft && (draft.size !== granted.size || [...draft].some((c) => !granted.has(c)))
  const toggle = (code) => {
    if (!canEdit) return
    const next = new Set(current)
    next.has(code) ? next.delete(code) : next.add(code)
    setDraft(next)
  }

  function savePerms() {
    const add = [...draft].filter((c) => !granted.has(c))
    const remove = [...granted].filter((c) => !draft.has(c))
    if (sel === user.xrole && remove.includes('settings.roles.update')) { toast("You can't remove role editing from your own role", 'warn'); return }
    commit((d) => {
      d.zxroleperm = d.zxroleperm.filter((rp) => !(rp.xrole === sel && remove.includes(rp.xcode)))
      add.forEach((xcode) => d.zxroleperm.push({ zid: ZID, xrole: sel, xcode, ztime: nowTs(), xgrantedby: user.zemail }))
      d.zxrole = d.zxrole.map((r) => (r.xrole === sel ? { ...r, zutime: nowTs() } : r))
    }, { module: 'settings', action: 'update', ref: sel, message: `Role ${sel}: granted ${add.length}, removed ${remove.length} permissions` })
    toast('Permissions saved')
    setDraft(null)
  }

  function saveRole(e) {
    e?.preventDefault()
    const isNew = !form.orig
    const code = form.xrole.trim().toUpperCase()
    const errs = {}
    if (!/^[A-Z][A-Z0-9_]{1,19}$/.test(code)) errs.xrole = 'Capital letters, digits and _ only (2–20)'
    else if (isNew && db.zxrole.some((r) => r.xrole === code)) errs.xrole = 'This role code already exists'
    if (!form.xname.trim()) errs.xname = 'Required'
    if (!isNew && form.zactive !== 1 && db.zxusers.some((u) => u.xrole === code && u.zactive === '1')) errs.zactive = 'Active users still have this role'
    setErrors(errs)
    if (Object.keys(errs).length) return
    const ts = nowTs()
    commit((d) => {
      if (isNew) d.zxrole.push({ zid: ZID, xrole: code, ztime: ts, zutime: ts, xname: form.xname.trim(), xdesc: form.xdesc.trim(), zactive: 1 })
      else d.zxrole = d.zxrole.map((r) => (r.xrole === code ? { ...r, xname: form.xname.trim(), xdesc: form.xdesc.trim(), zactive: form.zactive, zutime: ts } : r))
    }, { module: 'settings', action: isNew ? 'create' : 'update', ref: code, message: `${isNew ? 'Created' : 'Updated'} role ${code}` })
    toast(isNew ? 'Role created' : 'Role saved')
    setSel(code)
    setForm(null)
  }

  function deleteRole(r) {
    if (db.zxusers.some((u) => u.xrole === r.xrole)) { toast('Users are assigned to this role. Move them to another role first.', 'warn'); return }
    setConfirm({
      title: 'Delete role?', message: `${r.xname} (${r.xrole}) and its permission grants will be removed.`,
      onConfirm: () => {
        commit((d) => {
          d.zxroleperm = d.zxroleperm.filter((rp) => rp.xrole !== r.xrole)
          d.zxrole = d.zxrole.filter((x) => x.xrole !== r.xrole)
        }, { module: 'settings', action: 'delete', ref: r.xrole, message: `Deleted role ${r.xrole}` })
        setSel(db.zxrole.find((x) => x.xrole !== r.xrole)?.xrole)
        toast('Role deleted')
      },
    })
  }

  return (
    <div className="page">
      <PageHeader title="Roles & Permissions" subtitle="Each role grants a set of permissions. Users get their role's permissions plus any overrides."
        actions={can('settings.roles.create') && <button type="button" className="btn btn-primary" onClick={() => { setErrors({}); setForm({ xrole: '', xname: '', xdesc: '', zactive: 1 }) }}><Plus size={16} /> New role</button>} />
      <div className="roles-layout">
        <Card icon={UsersIcon} title="Roles" bodyClass="flush">
          <ul className="role-list">
            {db.zxrole.map((r) => {
              const users = db.zxusers.filter((u) => u.xrole === r.xrole).length
              const perms = db.zxroleperm.filter((rp) => rp.xrole === r.xrole).length
              return (
                <li key={r.xrole}>
                  <button type="button" className={sel === r.xrole ? 'active' : ''} onClick={() => setSel(r.xrole)}>
                    <span><strong>{r.xname}</strong> {r.zactive !== 1 && <Badge tone="muted">Inactive</Badge>}<small className="mono">{r.xrole}</small></span>
                    <span className="muted small">{users} users · {perms} perms</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Card>

        {role && (
          <Card icon={ShieldCheck} title={`${role.xname} permissions`} right={`${current.size} of ${db.zxperms.length} granted`}
            footer={<>
              <span>
                {can('settings.roles.update') && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setErrors({}); setForm({ ...role, orig: role }) }}><Pencil size={14} /> Edit role</button>}
                {can('settings.roles.delete') && role.xrole !== user.xrole && <button type="button" className="btn btn-ghost btn-sm danger" onClick={() => deleteRole(role)}><Trash2 size={14} /> Delete role</button>}
              </span>
              {canEdit && <span>
                {dirty && <button type="button" className="btn btn-ghost" onClick={() => setDraft(null)}>Discard</button>}
                <button type="button" className="btn btn-primary" disabled={!dirty} onClick={savePerms}>Save permissions</button>
              </span>}
            </>}>
            {role.xdesc && <p className="muted small role-desc">{role.xdesc}</p>}
            <div className="perm-groups">
              {groups.map(([g, list]) => {
                const all = list.every((p) => current.has(p.xcode))
                return (
                  <div key={g} className="perm-group">
                    <div className="perm-group-head">
                      <strong>{g.replace('.', ' › ').replace(/_/g, ' ')}</strong>
                      {canEdit && <button type="button" className="link small" onClick={() => {
                        const next = new Set(current)
                        list.forEach((p) => (all ? next.delete(p.xcode) : next.add(p.xcode)))
                        setDraft(next)
                      }}>{all ? 'Clear' : 'Select all'}</button>}
                    </div>
                    {list.map((p) => (
                      <label key={p.xcode} className={`perm ${canEdit ? '' : 'ro'}`}>
                        <input type="checkbox" checked={current.has(p.xcode)} onChange={() => toggle(p.xcode)} disabled={!canEdit || p.zactive !== 1} />
                        <span><strong>{p.xaction}</strong> <span className="muted">{p.xdesc}</span></span>
                        <Badge>{p.xrisk}</Badge>
                      </label>
                    ))}
                  </div>
                )
              })}
            </div>
          </Card>
        )}
      </div>

      {form && (
        <Modal title={form.orig ? `Edit role ${form.orig.xrole}` : 'New role'} onClose={() => setForm(null)} size="sm" footer={<>
          <button type="button" className="btn btn-ghost" onClick={() => setForm(null)}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={saveRole}>{form.orig ? 'Save' : 'Create role'}</button>
        </>}>
          <form className="form-grid form-grid-1" onSubmit={saveRole} noValidate>
            <Field label="Role code" required error={errors.xrole} hint="e.g. WARD_CLERK"><input className="input mono" disabled={!!form.orig} value={form.xrole} onChange={(e) => setForm({ ...form, xrole: e.target.value.toUpperCase() })} /></Field>
            <Field label="Name" required error={errors.xname}><input className="input" value={form.xname} onChange={(e) => setForm({ ...form, xname: e.target.value })} /></Field>
            <Field label="Description"><input className="input" value={form.xdesc ?? ''} onChange={(e) => setForm({ ...form, xdesc: e.target.value })} /></Field>
            {form.orig && <Field label="Status" error={errors.zactive}><span className="check"><input type="checkbox" checked={form.zactive === 1} onChange={(e) => setForm({ ...form, zactive: e.target.checked ? 1 : 0 })} /> Active</span></Field>}
            <button type="submit" hidden />
          </form>
        </Modal>
      )}
      {confirm && <Confirm {...confirm} danger confirmLabel="Delete" onClose={() => setConfirm(null)} />}
    </div>
  )
}
