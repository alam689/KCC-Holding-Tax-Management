import { useState } from 'react'
import { Building, Server } from 'lucide-react'
import { useData } from '../../data/store.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { Card, Field, NoAccess, PageHeader, Select, useToast } from '../../components/ui.jsx'
import { nowTs } from '../../data/tax.js'

function useForm(initial) {
  const [form, setForm] = useState(initial)
  return [form, (p) => setForm((f) => ({ ...f, ...p })), setForm]
}

// zbusiness — one row per tenant (zid 10 = KCC)
export function Business() {
  const { db, commit } = useData()
  const { can } = useAuth()
  const toast = useToast()
  const biz = db.zbusiness[0]
  const [form, set] = useForm(biz)
  const [errors, setErrors] = useState({})
  if (!can('settings.business.view')) return <NoAccess />
  const ro = !can('settings.business.update')
  const input = (k, label, extra = {}) => (
    <Field label={label} required={extra.required} error={errors[k]} span={extra.span}>
      <input className="input" value={form[k] ?? ''} disabled={ro} type={extra.type || 'text'} onChange={(e) => set({ [k]: e.target.value })} />
    </Field>
  )
  function save(e) {
    e.preventDefault()
    const errs = {}
    if (!form.zorg?.trim()) errs.zorg = 'Required'
    if (!form.xshort?.trim()) errs.xshort = 'Required'
    if (form.xemail && !/^\S+@\S+\.\S+$/.test(form.xemail)) errs.xemail = 'Not a valid email'
    setErrors(errs)
    if (Object.keys(errs).length) return
    commit((d) => { d.zbusiness = d.zbusiness.map((b) => (b.zid === biz.zid ? { ...form, zutime: nowTs() } : b)) },
      { module: 'settings', action: 'update', ref: String(biz.zid), message: 'Updated business profile' })
    toast('Business profile saved')
  }
  return (
    <div className="page">
      <PageHeader title="Business Profile" subtitle={`Organization details used on bills and receipts · zid ${biz.zid}`} />
      <form onSubmit={save} noValidate>
        <Card icon={Building} title="Organization" footer={!ro && <><span>Changes apply to new bills and receipts.</span><button type="submit" className="btn btn-primary">Save profile</button></>}>
          <div className="form-grid form-grid-3">
            {input('zorg', 'Organization name', { required: true, span: 2 })}
            {input('xshort', 'Short name', { required: true })}
            {input('xtaxnum', 'Tax / BIN number')}
            {input('xcontact', 'Contact person')}
            {input('xphone', 'Phone')}
            {input('xemail', 'Email', { type: 'email' })}
            {input('xurl', 'Website')}
            {input('xfax', 'Fax')}
            {input('xadd1', 'Address line 1', { span: 2 })}
            {input('xadd2', 'Address line 2')}
            {input('xcity', 'City')}
            {input('xstate', 'Division / state')}
            {input('xzip', 'Postcode')}
            {input('xcountry', 'Country')}
            <Field label="Currency"><Select value={form.xcur} disabled={ro} onChange={(v) => set({ xcur: v })} options={['BDT', 'USD']} /></Field>
            <Field label="Date format"><Select value={form.xdformat} disabled={ro} onChange={(v) => set({ xdformat: v })} options={['dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd']} /></Field>
          </div>
        </Card>
      </form>
    </div>
  )
}

// xsysconf — one row per tenant
export function SystemConfig() {
  const { db, commit } = useData()
  const { can } = useAuth()
  const toast = useToast()
  const conf = db.xsysconf[0]
  const [form, set] = useForm(conf)
  if (!can('settings.system_config.view')) return <NoAccess />
  const ro = !can('settings.system_config.update')
  function save(e) {
    e.preventDefault()
    commit((d) => { d.xsysconf = d.xsysconf.map((c) => (c.zid === conf.zid ? { ...form, zutime: nowTs() } : c)) },
      { module: 'settings', action: 'update', ref: 'xsysconf', message: 'Updated system configuration' })
    toast('System configuration saved')
  }
  return (
    <div className="page">
      <PageHeader title="System Config" subtitle="Server and document settings for this organization." />
      <form onSubmit={save} noValidate>
        <Card icon={Server} title="System" footer={!ro && <><span>Last changed {conf.zutime?.replace('T', ' ')}{conf.zemail ? ` by ${conf.zemail}` : ''}</span><button type="submit" className="btn btn-primary">Save</button></>}>
          <div className="form-grid">
            <Field label="Server OS" required><Select value={form.xsys} disabled={ro} onChange={(v) => set({ xsys: v })} options={['Windows', 'Linux']} /></Field>
            <Field label="Document folder" hint="Where scanned documents and exports are stored"><input className="input" disabled={ro} value={form.xdocdir ?? ''} onChange={(e) => set({ xdocdir: e.target.value })} placeholder={form.xsys === 'Windows' ? 'D:\\HTMS\\docs' : '/var/htms/docs'} /></Field>
            <Field label="System email" hint="Sender address for notices"><input className="input" type="email" disabled={ro} value={form.xemail ?? ''} onChange={(e) => set({ xemail: e.target.value })} /></Field>
          </div>
        </Card>
      </form>
    </div>
  )
}
