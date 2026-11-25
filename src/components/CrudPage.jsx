import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useData } from '../data/store.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { nowTs, ZID } from '../data/tax.js'
import { Card, Confirm, DataTable, Field, Modal, NoAccess, PageHeader, SearchBox, Select, useToast } from './ui.jsx'

// Which audit columns each table has (zemail = "last changed by", except where it is a key).
const AUDIT = {
  geo_thana: ['ztime', 'zemail'], geo_ward: ['ztime', 'zemail'], geo_road: ['ztime', 'zemail'],
  geo_building: ['ztime', 'zutime', 'zemail'], geo_holding_taxpayer: ['ztime', 'zutime', 'zemail'],
  xcodes: ['ztime', 'zutime'], zxusers: ['ztime', 'zutime'], zxrole: ['ztime', 'zutime'], zxuserperm: ['ztime'],
  geo_survey: ['ztime', 'zutime', 'zemail'], geo_assessment: ['ztime', 'zutime', 'zemail'], geo_ownership_transfer: ['ztime', 'zutime', 'zemail'],
}

// Generic list + add/edit/delete screen for one table.
//   fields: [{ name, label, type: text|number|select|textarea|date|checkbox|password, options(form, db),
//              required, lockOnEdit, span, hint, show(form) }]
//   perms:  { view, create, update, delete } permission codes
//   blockDelete(row, db) returns a reason string when a child row still references it (ON DELETE RESTRICT).
export default function CrudPage({
  title, subtitle, icon, table, rows: rowsFn, rowKey, columns, searchText, filters = [], fields, renderForm,
  defaults, toForm = (r) => ({ ...r }), fromForm = (f) => f, validate, blockDelete, perms, module, describe,
  onRowClick, rowActions, headerActions, formSize = 'md', entity = 'record', pageSize, canEditRow, canDeleteRow, onSaved, initialSort, startNew,
}) {
  const { db, commit } = useData()
  const { can, user } = useAuth()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [fv, setFv] = useState({})
  const [editing, setEditing] = useState(null) // { original|null, form }
  const [errors, setErrors] = useState({})
  const [confirm, setConfirm] = useState(null)

  // startNew: open the "Add" form on arrival, prefilled (e.g. an assessment started from a survey).
  useEffect(() => {
    if (startNew) { setErrors({}); setEditing({ original: null, form: { ...defaults(db), ...startNew } }) }
  }, [startNew]) // eslint-disable-line react-hooks/exhaustive-deps

  const all = rowsFn ? rowsFn(db) : db[table]
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return all.filter((r) => (!s || (searchText ? searchText(r) : Object.values(r).join(' ')).toLowerCase().includes(s))
      && filters.every((f) => !fv[f.key] || f.test(r, fv[f.key])))
  }, [all, q, fv, filters, searchText])

  if (perms?.view && !can(perms.view)) return <NoAccess />
  const canCreate = !perms?.create || can(perms.create)
  const canUpdate = !perms?.update || can(perms.update)
  const canDelete = perms?.delete !== false && (!perms?.delete || can(perms.delete))

  const open = (original) => {
    setErrors({})
    setEditing({ original, form: original ? toForm(original, db) : defaults(db) })
  }
  const set = (patch) => setEditing((e) => ({ ...e, form: { ...e.form, ...patch } }))

  function save() {
    const isNew = !editing.original
    const f = editing.form
    const errs = {}
    for (const fd of fields || []) {
      if (fd.required && (!fd.show || fd.show(f)) && (f[fd.name] === '' || f[fd.name] === null || f[fd.name] === undefined)) errs[fd.name] = 'Required'
    }
    Object.assign(errs, validate ? validate(f, isNew, db, editing.original) || {} : {})
    setErrors(errs)
    if (Object.keys(errs).length) return
    const ts = nowTs()
    const row = fromForm(f, isNew, db, editing.original)
    const audit = AUDIT[table] || []
    const stamped = isNew
      ? { zid: ZID, ...row, ...(audit.includes('ztime') ? { ztime: ts } : {}), ...(audit.includes('zutime') ? { zutime: ts } : {}), ...(audit.includes('zemail') ? { zemail: user.zemail } : {}) }
      : { ...editing.original, ...row, ...(audit.includes('zutime') ? { zutime: ts } : {}), ...(audit.includes('zemail') ? { zemail: user.zemail } : {}) }
    const label = describe ? describe(stamped) : rowKey(stamped)
    commit((d) => {
      if (isNew) d[table].push(stamped)
      else d[table] = d[table].map((r) => (rowKey(r) === rowKey(editing.original) ? stamped : r))
    }, { module, action: isNew ? 'create' : 'update', ref: String(rowKey(stamped)), message: `${isNew ? 'Added' : 'Updated'} ${entity} ${label}` })
    toast(`${entity[0].toUpperCase() + entity.slice(1)} ${isNew ? 'added' : 'saved'}`)
    setEditing(null)
    onSaved?.(stamped, isNew)
  }

  function askDelete(r) {
    const reason = blockDelete?.(r, db)
    if (reason) { toast(reason, 'warn'); return }
    setConfirm({
      title: `Delete ${entity}?`,
      message: `${describe ? describe(r) : rowKey(r)} will be removed. This can't be undone.`,
      onConfirm: () => {
        commit((d) => { d[table] = d[table].filter((x) => rowKey(x) !== rowKey(r)) },
          { module, action: 'delete', ref: String(rowKey(r)), message: `Deleted ${entity} ${describe ? describe(r) : rowKey(r)}` })
        toast(`${entity[0].toUpperCase() + entity.slice(1)} deleted`)
      },
    })
  }

  const actionCol = (canUpdate || canDelete || rowActions) ? [{
    key: '_actions', label: '', noSort: true, className: 'row-actions',
    render: (r) => (
      <span onClick={(e) => e.stopPropagation()}>
        {rowActions?.(r)}
        {canUpdate && (!canEditRow || canEditRow(r)) && <button type="button" className="icon-btn" title="Edit" aria-label="Edit" onClick={() => open(r)}><Pencil size={15} /></button>}
        {canDelete && (!canDeleteRow || canDeleteRow(r)) && <button type="button" className="icon-btn danger" title="Delete" aria-label="Delete" onClick={() => askDelete(r)}><Trash2 size={15} /></button>}
      </span>
    ),
  }] : []

  return (
    <div className="page">
      <PageHeader title={title} subtitle={subtitle} actions={<>
        {headerActions}
        {canCreate && <button type="button" className="btn btn-primary" onClick={() => open(null)}><Plus size={16} /> Add {entity}</button>}
      </>} />
      <Card>
        <div className="toolbar">
          <SearchBox value={q} onChange={setQ} />
          {filters.map((f) => (
            <Select key={f.key} value={fv[f.key]} onChange={(v) => setFv((s) => ({ ...s, [f.key]: v }))} options={f.options(db)} placeholder={f.label} aria-label={f.label} />
          ))}
        </div>
        <DataTable columns={[...columns, ...actionCol]} rows={rows} rowKey={(r) => String(rowKey(r))} onRowClick={onRowClick} pageSize={pageSize} initialSort={initialSort} />
      </Card>

      {editing && (
        <Modal title={`${editing.original ? 'Edit' : 'Add'} ${entity}`} onClose={() => setEditing(null)} size={formSize}
          footer={<>
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={save}>{editing.original ? 'Save changes' : `Add ${entity}`}</button>
          </>}>
          <form className="form-grid" onSubmit={(e) => { e.preventDefault(); save() }} noValidate>
            {renderForm
              ? renderForm({ form: editing.form, set, errors, isNew: !editing.original, db })
              : fields.filter((fd) => !fd.show || fd.show(editing.form)).map((fd) => (
                <FormField key={fd.name} fd={fd} form={editing.form} set={set} error={errors[fd.name]} isNew={!editing.original} db={db} />
              ))}
            <button type="submit" hidden />
          </form>
        </Modal>
      )}
      {confirm && <Confirm {...confirm} danger confirmLabel="Delete" onClose={() => setConfirm(null)} />}
    </div>
  )
}

export function FormField({ fd, form, set, error, isNew, db }) {
  const v = form[fd.name]
  const disabled = (fd.lockOnEdit && !isNew) || fd.disabled
  const onChange = (val) => set({ [fd.name]: fd.type === 'number' ? (val === '' ? '' : Number(val)) : val, ...(fd.onChange ? fd.onChange(val, form, db) : {}) })
  let input
  if (fd.type === 'display') input = <div className="input readonly">{fd.render(form, db)}</div>
  else if (fd.type === 'select') input = <Select value={v} onChange={onChange} options={fd.options(form, db)} placeholder={fd.placeholder ?? 'Select…'} disabled={disabled} />
  else if (fd.type === 'textarea') input = <textarea className="input" rows={3} value={v ?? ''} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
  else if (fd.type === 'checkbox') input = (
    <span className="check"><input type="checkbox" checked={!!v} onChange={(e) => set({ [fd.name]: e.target.checked, ...(fd.onChange ? fd.onChange(e.target.checked, form, db) : {}) })} disabled={disabled} /> {fd.checkLabel}</span>
  )
  else input = <input className="input" type={fd.type || 'text'} value={v ?? ''} onChange={(e) => onChange(e.target.value)} disabled={disabled} step={fd.step} min={fd.min} placeholder={fd.placeholder} />
  return <Field label={fd.label} required={fd.required} error={error} hint={fd.hint} span={fd.span}>{input}</Field>
}
