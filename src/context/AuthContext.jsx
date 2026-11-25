import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useData } from '../data/store.jsx'
import { today } from '../data/tax.js'

const AuthContext = createContext(null)
const KEY = 'htms.session'

function readSession() {
  try { return sessionStorage.getItem(KEY) } catch { return null }
}

// Effective permissions = role grants (zxroleperm) + active per-user GRANT overrides − active DENY overrides (zxuserperm).
export function effectivePerms(db, user) {
  if (!user) return new Set()
  const set = new Set(db.zxroleperm.filter((rp) => rp.xrole === user.xrole).map((rp) => rp.xcode))
  const d = today()
  const active = db.zxuserperm.filter((o) => o.zemail === user.zemail && !o.zrevokedat && o.dfrom <= d && (!o.dto || o.dto >= d))
  active.filter((o) => o.xeffect === 'GRANT').forEach((o) => set.add(o.xcode))
  active.filter((o) => o.xeffect === 'DENY').forEach((o) => set.delete(o.xcode))
  const activeCodes = new Set(db.zxperms.filter((p) => p.zactive === 1).map((p) => p.xcode))
  return new Set([...set].filter((c) => activeCodes.has(c)))
}

export function AuthProvider({ children }) {
  const { db, setActor } = useData()
  const [email, setEmail] = useState(readSession)

  const user = useMemo(() => {
    const u = db.zxusers.find((x) => x.zemail === email && x.zactive === '1')
    if (!u) return null
    const role = db.zxrole.find((r) => r.xrole === u.xrole)
    return { ...u, roleName: role?.xname ?? u.xrole }
  }, [db.zxusers, db.zxrole, email])

  const perms = useMemo(() => effectivePerms(db, user), [db, user])
  useEffect(() => setActor(user?.zemail), [user, setActor])

  // Front-end only: compares against demo passwords in the mock zxusers table.
  function login(address, password) {
    const u = db.zxusers.find((x) => x.zemail.toLowerCase() === address.trim().toLowerCase())
    if (!u || u.xpassword !== password) return { ok: false, error: 'Invalid email or password.' }
    if (u.zactive !== '1') return { ok: false, error: 'This account is inactive.' }
    try { sessionStorage.setItem(KEY, u.zemail) } catch {}
    setEmail(u.zemail)
    return { ok: true }
  }

  function logout() {
    try { sessionStorage.removeItem(KEY) } catch {}
    setEmail(null)
  }

  const can = (code) => perms.has(code)
  return <AuthContext.Provider value={{ user, login, logout, can, perms }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
