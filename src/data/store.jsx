import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { buildSeed } from './seed.js'
import { ZID, nowTs } from './tax.js'

// In-browser stand-in for the htms database. Tables are arrays keyed by their DB names.
// Changes persist in localStorage for this browser only; "Reset demo data" restores the seed.
const KEY = 'htms.db.v2' // bump when the seed's table set changes
const DataContext = createContext(null)

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return buildSeed()
}

export function DataProvider({ children }) {
  const [db, setDb] = useState(load)
  const actor = useRef('system')

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(db)) } catch {}
  }, [db])

  // commit(mutator, event?) — mutator receives shallow-copied tables; replace rows, don't mutate them.
  const commit = useCallback((mutator, event) => {
    setDb((prev) => {
      const next = Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, Array.isArray(v) ? [...v] : v]))
      mutator(next)
      if (event) {
        const xevent = (next.zxevents.reduce((m, e) => Math.max(m, e.xevent), 0) || 0) + 1
        next.zxevents.push({
          zid: ZID, xevent, ztime: nowTs(), zemail: actor.current, xkind: event.kind || 'activity',
          xmodule: event.module, xaction: event.action, xtrnnum: event.ref ?? null, xmessage: event.message,
          xpath: event.path ?? null, xread: event.kind === 'notice' ? 0 : 1,
        })
      }
      return next
    })
  }, [])

  const reset = useCallback(() => setDb(buildSeed()), [])
  const setActor = useCallback((email) => { actor.current = email || 'system' }, [])

  const value = useMemo(() => ({ db, commit, reset, setActor, actor }), [db, commit, reset, setActor])
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useData = () => useContext(DataContext)

// Helpers for the common lookups.
export const lookups = (db) => ({
  ward: (w) => db.geo_ward.find((x) => x.xwardid === Number(w)),
  road: (w, r) => db.geo_road.find((x) => x.xwardid === Number(w) && x.xroadid === Number(r)),
  taxpayer: (tc) => db.geo_holding_taxpayer.find((t) => t.xtaxcode === tc),
  bill: (no) => db.geo_holding_bill.find((b) => b.xbillno === no),
  codes: (type) => db.xcodes.filter((c) => c.xtype === type && c.zactive !== '0'),
})
