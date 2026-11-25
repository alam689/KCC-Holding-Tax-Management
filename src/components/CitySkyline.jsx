import { useEffect, useRef } from 'react'
import { mountSkyline } from './skylineScene.js'

// Animated login skyline (see skylineScene.js). Decorative only.
export default function CitySkyline() {
  const ref = useRef(null)
  useEffect(() => mountSkyline(ref.current), [])
  return (
    <svg
      ref={ref}
      className="skyline"
      viewBox="-60 -82 920 552"
      preserveAspectRatio="xMidYMax meet"
      fontFamily="'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif"
      aria-hidden="true"
    />
  )
}
