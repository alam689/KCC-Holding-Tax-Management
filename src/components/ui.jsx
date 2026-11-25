import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Lock, Search, X, CheckCircle2, AlertTriangle, Inbox } from 'lucide-react'

export function PageHeader({ title, subtitle, back, actions }) {
  return (
    <div className="page-head">
      <div>
        {back && <Link to={back.to} className="back-link"><ChevronLeft size={15} /> {back.label}</Link>}
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}

export function Card({ icon: Icon, title, right, children, footer, className = '', bodyClass = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || right) && (
        <header className="card-head">
          <h3>{Icon && <Icon size={17} strokeWidth={1.8} />} {title}</h3>
          {right && <span className="muted small">{right}</span>}
        </header>
      )}
      <div className={`card-body ${bodyClass}`}>{children}</div>
      {footer && <footer className="card-foot">{footer}</footer>}
    </section>
  )
}

const TONES = {
  Active: 'ok', Received: 'ok', Paid: 'ok', GRANT: 'ok', Verified: 'ok', '1': 'ok',
  Issued: 'info', Partial: 'warn', Pending: 'warn', Carried: 'muted', Inactive: 'muted', '0': 'muted', Revoked: 'muted',
  Cancelled: 'danger', DENY: 'danger', CRITICAL: 'danger', HIGH: 'warn', MEDIUM: 'info', LOW: 'muted',
}
export function Badge({ children, tone }) {
  return <span className={`badge badge-${tone || TONES[children] || 'muted'}`}>{children}</span>
}

export function Modal({ title, onClose, children, footer, size = 'md' }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <h3>{title}</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  )
}

export function Confirm({ title, message, confirmLabel = 'Confirm', danger, onConfirm, onClose }) {
  return (
    <Modal title={title} onClose={onClose} size="sm" footer={<>
      <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => { onConfirm(); onClose() }}>{confirmLabel}</button>
    </>}>
      <p className="confirm-msg">{message}</p>
    </Modal>
  )
}

export function Field({ label, required, error, hint, children, span }) {
  return (
    <label className={`field ${span ? `span-${span}` : ''} ${error ? 'has-error' : ''}`}>
      <span>{label}{required && <em className="req">*</em>}</span>
      {children}
      {error ? <small className="field-error">{error}</small> : hint ? <small className="field-hint">{hint}</small> : null}
    </label>
  )
}

export function SearchBox({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div className="search">
      <Search size={15} />
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {value && <button type="button" className="icon-btn" onClick={() => onChange('')} aria-label="Clear search"><X size={14} /></button>}
    </div>
  )
}

export function Empty({ icon: Icon = Inbox, title = 'Nothing here yet', children }) {
  return (
    <div className="empty">
      <Icon size={34} strokeWidth={1.5} />
      <strong>{title}</strong>
      {children && <div className="muted">{children}</div>}
    </div>
  )
}

export function NoAccess() {
  return (
    <div className="page">
      <div className="card"><Empty icon={Lock} title="You don't have access to this screen">Ask a system admin to grant the permission to your role.</Empty></div>
    </div>
  )
}

// Sortable, paginated table. columns: { key, label, render?(row), sort?(row) value, num?, className? }
export function DataTable({ columns, rows, rowKey, onRowClick, pageSize = 15, empty, initialSort, footer }) {
  const [sort, setSort] = useState(initialSort || null)
  const [page, setPage] = useState(0)
  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    const val = col?.sort || ((r) => r[sort.key])
    return [...rows].sort((a, b) => {
      const x = val(a), y = val(b)
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''), undefined, { numeric: true })
      return sort.dir === 'asc' ? c : -c
    })
  }, [rows, sort, columns])
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize))
  useEffect(() => { if (page >= pages) setPage(0) }, [pages, page])
  const view = sorted.slice(page * pageSize, page * pageSize + pageSize)

  if (!rows.length) return empty ?? <Empty />
  return (
    <>
      <div className="table-wrap">
        <table className="table table-data">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={`${c.num ? 'num' : ''} ${c.noSort ? '' : 'sortable'}`}
                  onClick={() => !c.noSort && setSort((s) => ({ key: c.key, dir: s?.key === c.key && s.dir === 'asc' ? 'desc' : 'asc' }))}>
                  {c.label}
                  {sort?.key === c.key && (sort.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.map((r) => (
              <tr key={rowKey(r)} className={onRowClick ? 'clickable' : ''} onClick={onRowClick ? () => onRowClick(r) : undefined}>
                {columns.map((c) => <td key={c.key} className={`${c.num ? 'num' : ''} ${c.className || ''}`}>{c.render ? c.render(r) : r[c.key] ?? '—'}</td>)}
              </tr>
            ))}
          </tbody>
          {footer && <tfoot>{footer}</tfoot>}
        </table>
      </div>
      <div className="pager">
        <span className="muted small">{sorted.length ? `${page * pageSize + 1}–${Math.min(sorted.length, (page + 1) * pageSize)} of ${sorted.length}` : '0'}</span>
        {pages > 1 && (
          <div className="pager-btns">
            <button type="button" className="btn btn-ghost btn-sm" disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Previous page"><ChevronLeft size={15} /></button>
            <span className="small">Page {page + 1} / {pages}</span>
            <button type="button" className="btn btn-ghost btn-sm" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} aria-label="Next page"><ChevronRight size={15} /></button>
          </div>
        )}
      </div>
    </>
  )
}

export function KV({ items }) {
  return (
    <dl className="kv">
      {items.filter(Boolean).map(([k, v]) => (
        <div key={k}><dt>{k}</dt><dd>{v === null || v === undefined || v === '' ? '—' : v}</dd></div>
      ))}
    </dl>
  )
}

const ToastContext = createContext(() => {})
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const push = useCallback((message, tone = 'ok') => {
    const id = Math.random()
    setToasts((t) => [...t, { id, message, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            {t.tone === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />} {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
export const useToast = () => useContext(ToastContext)

export function Select({ value, onChange, options, placeholder, ...rest }) {
  return (
    <select className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => {
        const [v, l] = Array.isArray(o) ? o : [o, o]
        return <option key={v} value={v}>{l}</option>
      })}
    </select>
  )
}
