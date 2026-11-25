// HTMS mark: a blue civic building with a small "%" tax badge.
export default function Emblem({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="emblem">
      <path d="M20 4 3 13h34L20 4Z" fill="#3b82f6" />
      <rect x="5" y="14" width="30" height="3" rx="1" fill="#60a5fa" />
      <rect x="7" y="18" width="26" height="15" rx="1.5" fill="#2563eb" />
      <g fill="#dbeafe">
        <rect x="10" y="21" width="3" height="3" /><rect x="15" y="21" width="3" height="3" />
        <rect x="22" y="21" width="3" height="3" /><rect x="27" y="21" width="3" height="3" />
        <rect x="10" y="26" width="3" height="3" /><rect x="15" y="26" width="3" height="3" />
      </g>
      <rect x="5" y="33" width="30" height="2.5" rx="1" fill="#60a5fa" />
      <circle cx="31" cy="31" r="7" fill="#1d4ed8" stroke="#0b1628" strokeWidth="2" />
      <g stroke="#fff" strokeWidth="1.4" strokeLinecap="round">
        <path d="m28.2 33.8 5.6-5.6" />
      </g>
      <circle cx="28.6" cy="28.6" r="1.1" fill="#fff" />
      <circle cx="33.4" cy="33.4" r="1.1" fill="#fff" />
    </svg>
  )
}
