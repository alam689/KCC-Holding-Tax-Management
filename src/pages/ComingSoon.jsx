import { Link, useLocation } from 'react-router-dom'
import { Hammer } from 'lucide-react'
import { findLabel } from '../components/nav.js'

export default function ComingSoon() {
  const { pathname } = useLocation()
  const label = findLabel(pathname) ?? 'Page not found'
  return (
    <div className="page">
      <div className="page-head"><h1>{label}</h1></div>
      <div className="panel empty">
        <Hammer size={36} strokeWidth={1.5} />
        <p>{findLabel(pathname) ? 'This screen is not built yet.' : 'There is no screen at this address.'}</p>
        <Link to="/" className="btn btn-primary">Back to dashboard</Link>
      </div>
    </div>
  )
}
