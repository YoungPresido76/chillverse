// src/components/AppLayout.tsx
import { useState } from 'react'
import { Outlet, useLocation, useSearchParams } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
}

/**
 * Shared shell for every authenticated page — ambient background glow,
 * the sidebar drawer, the topbar, and the active child route via <Outlet />.
 * Sidebar open/close state lives here (not in individual pages) so it's
 * forward-compatible with the README's planned Mall/Achievements/Profile/
 * Leaderboard pages without rebuilding the shell later.
 */
export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()

  const title =
    pathname === '/coming-soon'
      ? searchParams.get('feature') || 'Coming Soon'
      : ROUTE_TITLES[pathname] || 'Dashboard'

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="glow glow-violet" />
        <div className="glow glow-cyan" />
        <div className="glow glow-pink" />
        <div className="glow glow-orange" />
      </div>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Topbar title={title} onMenuClick={() => setSidebarOpen(true)} />

      <main className="md:pl-[260px] pt-[92px] px-5 md:px-8 pb-12">
        <Outlet />
      </main>
    </div>
  )
}
