import {
  LayoutDashboard, MapPinned, Building2, Users, Receipt, Wallet, Settings,
} from 'lucide-react'

// Each menu maps to a table group in the htms database.
// `perm` hides an item unless the signed-in user effectively holds that zxperms code.
export const nav = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/' },
  {
    label: 'Location', icon: MapPinned,
    children: [
      { label: 'Thana', to: '/geo/thana', perm: 'geo.location.view' },
      { label: 'Wards', to: '/geo/wards', perm: 'geo.location.view' },
      { label: 'Roads', to: '/geo/roads', perm: 'geo.location.view' },
    ],
  },
  { label: 'Buildings', icon: Building2, to: '/buildings', perm: 'geo.buildings.view' },
  {
    label: 'Holdings', icon: Users,
    children: [
      { label: 'Taxpayers', to: '/taxpayers', perm: 'holding.taxpayers.view' },
      { label: 'Field Survey', to: '/survey', perm: 'holding.survey.view' },
      { label: 'Assessment', to: '/assessment', perm: 'holding.assessment.view' },
      { label: 'Ownership Transfer', to: '/transfer', perm: 'holding.transfer.view' },
    ],
  },
  {
    label: 'Billing', icon: Receipt,
    children: [
      { label: 'Holding Tax Bills', to: '/bills', perm: 'holding.bills.view' },
      { label: 'Generate Bills', to: '/bills/generate', perm: 'holding.bills.generate' },
    ],
  },
  {
    label: 'Collections', icon: Wallet,
    children: [
      { label: 'All Collections', to: '/collections', perm: 'holding.collections.view' },
      { label: 'New Collection', to: '/collections/new', perm: 'holding.collections.create' },
    ],
  },
  {
    label: 'Settings', icon: Settings,
    children: [
      { label: 'Business Profile', to: '/settings/business', perm: 'settings.business.view' },
      { label: 'Users', to: '/settings/users', perm: 'settings.users.view' },
      { label: 'Roles & Permissions', to: '/settings/roles', perm: 'settings.roles.view' },
      { label: 'Permission Overrides', to: '/settings/overrides', perm: 'settings.users.view' },
      { label: 'Codes', to: '/settings/codes', perm: 'settings.system_config.view' },
      { label: 'System Config', to: '/settings/system', perm: 'settings.system_config.view' },
      { label: 'Activity Log', to: '/settings/activity', perm: 'settings.system_config.view' },
    ],
  },
]

const flat = nav.flatMap((i) => (i.children ? i.children : [i]))
// Exact match first, then the longest menu path the URL sits under (e.g. /bills/HB-… → Holding Tax Bills).
export function findLabel(pathname) {
  const exact = flat.find((i) => i.to === pathname)
  if (exact) return exact.label
  const parent = flat.filter((i) => i.to !== '/' && pathname.startsWith(i.to + '/')).sort((a, b) => b.to.length - a.to.length)[0]
  return parent ? parent.label : null
}
