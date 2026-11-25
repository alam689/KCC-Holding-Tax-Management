import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bell, ChevronRight, Home as HomeIcon, Lightbulb, LogOut, Menu, CheckCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../data/store.jsx'
import { fiscalYearOf, fmtTs } from '../data/tax.js'
import { findLabel, nav } from './nav.js'
import Emblem from './Emblem.jsx'

function NavGroup({ item, children }) {
  const { pathname } = useLocation()
  const active = children.some((c) => pathname === c.to || pathname.startsWith(c.to + '/'))
  const [open, setOpen] = useState(active)
  useEffect(() => { if (active) setOpen(true) }, [active])
  const Icon = item.icon
  return (
    <li className={`nav-group ${open ? 'open' : ''} ${active ? 'has-active' : ''}`}>
      <button type="button" className="nav-link" onClick={() => setOpen((o) => !o)} title={item.label} aria-expanded={open}>
        <Icon size={17} strokeWidth={1.8} />
        <span className="nav-text">{item.label}</span>
        <ChevronRight size={15} className="nav-caret" />
      </button>
      {open && (
        <ul className="nav-sub">
          {children.map((c) => (
            <li key={c.to}><NavLink to={c.to} end className="nav-sublink">{c.label}</NavLink></li>
          ))}
        </ul>
      )}
    </li>
  )
}

function initials(name) {
  return name.split(/[\s.]+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('')
}

function usePopover() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  return [open, setOpen, ref]
}

export default function Layout() {
  const { user, logout, can } = useAuth()
  const { db, commit } = useData()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen, menuRef] = usePopover()
  const [bellOpen, setBellOpen, bellRef] = usePopover()
  const { pathname } = useLocation()
  const biz = db.zbusiness[0]

  useEffect(() => { setMobileOpen(false); setMenuOpen(false); setBellOpen(false) }, [pathname, setMenuOpen, setBellOpen])

  function toggleSidebar() {
    if (window.matchMedia('(max-width: 900px)').matches) setMobileOpen((o) => !o)
    else setCollapsed((c) => !c)
  }

  const notices = db.zxevents.filter((e) => e.zemail === user.zemail && e.xkind === 'notice').sort((a, b) => b.xevent - a.xevent)
  const unread = notices.filter((e) => e.xread === 0).length
  const markRead = (ids) => commit((d) => { d.zxevents = d.zxevents.map((e) => (ids.includes(e.xevent) ? { ...e, xread: 1 } : e)) })

  const now = new Date()
  const dow = now.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase()
  const dm = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const pageLabel = findLabel(pathname) ?? 'Not found'

  const visible = nav.map((item) => (item.children ? { ...item, kids: item.children.filter((c) => !c.perm || can(c.perm)) } : item))
    .filter((item) => (item.kids ? item.kids.length : !item.perm || can(item.perm)))

  return (
    <div className={`shell ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      <aside className="sidebar">
        <div className="brand">
          <Emblem size={34} />
          <div className="brand-text">
            <span className="brand-org">{biz.xshort}</span>
            <strong><em>HTMS</em> Holding Tax</strong>
          </div>
        </div>
        <nav aria-label="Main">
          <ul className="nav">
            {visible.map((item) =>
              item.kids ? (
                <NavGroup key={item.label} item={item}>{item.kids}</NavGroup>
              ) : (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.to === '/'} className="nav-link" title={item.label}>
                    <item.icon size={17} strokeWidth={1.8} />
                    <span className="nav-text">{item.label}</span>
                  </NavLink>
                </li>
              ),
            )}
          </ul>
        </nav>
        <div className="sidebar-foot">FY {fiscalYearOf()}</div>
      </aside>
      {mobileOpen && <div className="scrim" onClick={() => setMobileOpen(false)} />}

      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button type="button" className="topbar-btn" onClick={toggleSidebar} aria-label="Toggle menu"><Menu size={18} /></button>
            <div className="crumb"><HomeIcon size={15} /> {pageLabel}</div>
          </div>
          <div className="topbar-right">
            <button type="button" className="topbar-btn hide-sm" aria-label="Tips" title="Tip: rates and policy values live in Settings → Codes"><Lightbulb size={17} /></button>
            <div className="user-menu" ref={bellRef}>
              <button type="button" className="topbar-btn bell" onClick={() => setBellOpen((o) => !o)} aria-label={`Notifications, ${unread} unread`} aria-expanded={bellOpen}>
                <Bell size={17} />
                {unread > 0 && <span className="bell-badge">{unread}</span>}
              </button>
              {bellOpen && (
                <div className="dropdown dropdown-wide">
                  <div className="dropdown-title">
                    <strong>Notifications</strong>
                    {unread > 0 && <button type="button" className="link small" onClick={() => markRead(notices.map((n) => n.xevent))}><CheckCheck size={14} /> Mark all read</button>}
                  </div>
                  {notices.length ? notices.slice(0, 6).map((n) => (
                    <button key={n.xevent} type="button" className={`notice ${n.xread ? '' : 'unread'}`}
                      onClick={() => { markRead([n.xevent]); setBellOpen(false); if (n.xpath) navigate(n.xpath) }}>
                      <span>{n.xmessage}</span>
                      <small className="muted">{fmtTs(n.ztime)}</small>
                    </button>
                  )) : <p className="muted small notice-empty">No notifications.</p>}
                  {can('settings.system_config.view') && <Link to="/settings/activity" className="dropdown-item small">See all activity</Link>}
                </div>
              )}
            </div>
            <div className="today hide-sm">
              <span className="dow">{dow}</span> <strong>{dm}</strong> <span className="yr">{now.getFullYear()}</span>
            </div>
            <div className="user-menu" ref={menuRef}>
              <button type="button" className="user-btn" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen}>
                <span className="user-meta hide-sm">
                  <strong>{user.xname}</strong>
                  <span>{user.xrole}</span>
                </span>
                <span className="avatar">{initials(user.xname)}</span>
              </button>
              {menuOpen && (
                <div className="dropdown">
                  <div className="dropdown-head">
                    <strong>{user.xname}</strong>
                    <span>{user.zemail}</span>
                    <span className="role-badge">{user.roleName}</span>
                  </div>
                  <button type="button" className="dropdown-item" onClick={logout}><LogOut size={15} /> Sign out</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="content"><Outlet /></div>

        <footer className="footer">© {biz.zorg} {now.getFullYear()} · Developed by DataMart BD Limited</footer>
      </div>
    </div>
  )
}
