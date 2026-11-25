import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Landmark } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../data/store.jsx'
import Emblem from '../components/Emblem.jsx'
import CitySkyline from '../components/CitySkyline.jsx'

export default function Login() {
  const { user, login } = useAuth()
  const { db } = useData()
  // Workspaces come from zbusiness. Only KCC exists today.
  const workspaces = db.zbusiness.map((b) => ({ zid: b.zid, code: b.xshort, name: b.zorg, domain: `${b.xshort.toLowerCase()}.com` }))
  const navigate = useNavigate()
  const location = useLocation()
  const [ws, setWs] = useState(workspaces[0])
  const [local, setLocal] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (user) return <Navigate to="/" replace />

  function onSubmit(e) {
    e.preventDefault()
    if (!local.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    const email = local.includes('@') ? local.trim() : `${local.trim()}@${ws.domain}`
    const res = login(email, password)
    if (!res.ok) {
      setError(res.error)
      return
    }
    navigate(location.state?.from?.pathname || '/', { replace: true })
  }

  return (
    <div className="login-page">
      <aside className="login-brand">
        <div className="login-logo">
          <Emblem size={40} />
          <div>
            <strong>HTMS</strong>
            <span>Holding Tax Management System</span>
          </div>
        </div>

        <div className="login-tagline">
          <div>Smarter holding tax.</div>
          <div className="dim">For a better-run city.</div>
        </div>

        <CitySkyline />

        <div className="login-copy">© DataMart BD Limited</div>
      </aside>

      <main className="login-main">
        <div className="login-stack">
          <section className="card login-card">
            <h2 className="card-title">Workspace</h2>
            <p className="card-sub">Which organization are you signing in to?</p>
            <div className="ws-grid">
              {workspaces.map((w) => (
                <button
                  key={w.zid}
                  type="button"
                  className={`ws-option ${ws.zid === w.zid ? 'selected' : ''}`}
                  onClick={() => setWs(w)}
                  aria-pressed={ws.zid === w.zid}
                >
                  <Landmark size={18} />
                  <span>
                    <strong>{w.code}</strong>
                    <small>{w.name}</small>
                  </span>
                  {ws.zid === w.zid && <Check size={14} className="ws-check" />}
                </button>
              ))}
            </div>
          </section>

          <form className="card login-card" onSubmit={onSubmit} noValidate>
            <h2 className="signin-title">Sign in</h2>
            <p className="card-sub">Enter your credentials to access the workspace.</p>

            <label className="field">
              <span>Email</span>
              <div className="input-group">
                <input
                  type="text"
                  autoComplete="username"
                  placeholder="you"
                  value={local}
                  onChange={(e) => { setLocal(e.target.value); setError('') }}
                  autoFocus
                />
                <span className="input-suffix">@{ws.domain}</span>
              </div>
            </label>

            <label className="field">
              <span>Password</span>
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
              />
            </label>

            {error && <div className="form-error" role="alert">{error}</div>}

            <button className="btn btn-primary btn-block" type="submit">
              Sign in <ArrowRight size={15} />
            </button>

            <p className="demo-hint">Demo (front end only): <code>alam</code>, <code>assessor</code> or <code>collector</code> · password <code>demo1234</code></p>
          </form>
        </div>
      </main>
    </div>
  )
}
