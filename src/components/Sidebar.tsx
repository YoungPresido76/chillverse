// src/components/Sidebar.tsx
import { Link, useLocation } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { LayoutDashboard, Wand2, ShoppingBag, Trophy, MessageCircle, User, Settings, Bell, X } from 'lucide-react'
import { ripple } from '../lib/ripple'

// TODO: replace with real unread counts
const MALL_BADGE_COUNT = 3
const CHAT_BADGE_COUNT = 5
const NOTIFICATIONS_BADGE_COUNT = 12

interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  badge?: number
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Studio', to: '/coming-soon?feature=Studio', icon: Wand2 },
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Mall', to: '/coming-soon?feature=Mall', icon: ShoppingBag, badge: MALL_BADGE_COUNT },
  { label: 'Achievements', to: '/coming-soon?feature=Achievements', icon: Trophy },
  { label: 'Chat', to: '/coming-soon?feature=Chat', icon: MessageCircle, badge: CHAT_BADGE_COUNT },
  { label: 'Profile', to: '/coming-soon?feature=Profile', icon: User },
  { label: 'Settings', to: '/coming-soon?feature=Settings', icon: Settings },
  { label: 'Notifications', to: '/coming-soon?feature=Notifications', icon: Bell, badge: NOTIFICATIONS_BADGE_COUNT },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

/**
 * Checks whether a nav item matches the current location exactly —
 * path AND query string (for /coming-soon?feature=X entries). This is the
 * correctness fix vs. the source mockup, which tracked the active item with
 * local useState and would show the wrong item highlighted after navigating
 * away and back.
 */
function isItemActive(item: NavItem, pathname: string, search: string): boolean {
  const [path, query] = item.to.split('?')
  if (path !== pathname) return false
  if (!query) return true
  return search === `?${query}`
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { pathname, search } = useLocation()

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[340] bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`glass-panel-strong glow-violet-tint fixed top-0 left-0 z-[350] h-screen w-[260px] flex flex-col p-5 transition-transform duration-300 md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between mb-8">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <span className="text-2xl">🎮</span>
            <span className="text-lg font-bold text-gradient-2">Chillverse</span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="md:hidden text-chill-textMuted hover:text-chill-text transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 flex flex-col gap-1.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = isItemActive(item, pathname, search)
            const Icon = item.icon
            return (
              <Link
                key={item.label}
                to={item.to}
                onClick={(e) => {
                  ripple(e)
                  onClose()
                }}
                className={`relative overflow-hidden flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-chill-violet/15 text-chill-violetSoft border border-chill-violet/30'
                    : 'text-chill-textSecondary hover:bg-white/5 hover:text-chill-text'
                }`}
              >
                <Icon size={18} />
                <span className="flex-1">{item.label}</span>
                {item.badge !== undefined && (
                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-chill-pink/20 text-chill-pink">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <Link
          to="/coming-soon?feature=Go%20Premium"
          onClick={(e) => ripple(e)}
          className="glass-chip relative overflow-hidden mt-4 rounded-xl p-4 text-center hover:border-chill-amber/40 transition-all"
        >
          <div className="text-sm font-bold text-chill-amber mb-1">⭐ Go Premium</div>
          <div className="text-[11px] text-chill-textMuted">Unlock exclusive perks</div>
        </Link>
      </aside>
    </>
  )
}
