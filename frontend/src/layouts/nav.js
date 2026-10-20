import {
  Camera,
  Dumbbell,
  Flame,
  HeartPulse,
  Home,
  MessageSquare,
  ScanLine,
  Settings,
  ShoppingCart,
  Smartphone,
  Utensils,
} from 'lucide-react'

export const NAV_GROUPS = [
  {
    title: 'Train',
    items: [
      { to: '/dashboard', label: 'Home Base', short: 'Home', icon: Home },
      { to: '/counter', label: 'Workout Coach', short: 'Train', icon: Dumbbell },
      { to: '/vision', label: 'Vision Lab', short: 'Vision', icon: ScanLine },
      { to: '/chat', label: 'AI Coach', short: 'Coach', icon: MessageSquare },
    ],
  },
  {
    title: 'Fuel & Health',
    items: [
      { to: '/nutrition', label: 'Nutrition', short: 'Fuel', icon: Utensils },
      { to: '/heart-health', label: 'Heart Health', short: 'Heart', icon: HeartPulse },
      { to: '/shopping-cart', label: 'Wish List', short: 'Cart', icon: ShoppingCart },
    ],
  },
  {
    title: 'Progress',
    items: [
      { to: '/analytics', label: 'Stats & Streaks', short: 'Stats', icon: Flame },
      { to: '/gallery', label: 'Progress Gallery', short: 'Gallery', icon: Camera },
    ],
  },
  {
    title: 'Setup',
    items: [
      { to: '/integrations', label: 'Integrations', short: 'Sync', icon: Smartphone },
      { to: '/settings', label: 'Settings', short: 'Settings', icon: Settings },
    ],
  },
]

export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items)

// Bottom tab bar on phones; everything else lives under "More".
export const TAB_ITEMS = ['/dashboard', '/counter', '/chat', '/nutrition'].map((to) => ALL_NAV_ITEMS.find((item) => item.to === to))

export function titleForPath(pathname) {
  if (pathname.startsWith('/posture-reading')) return 'Posture Reading'
  return ALL_NAV_ITEMS.find((item) => pathname.startsWith(item.to))?.label || 'ARIZE'
}
