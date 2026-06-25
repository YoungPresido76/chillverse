// src/App.tsx
import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import Dashboard from './pages/Dashboard'
import ComingSoon from './pages/ComingSoon'
import Games from './pages/Games'
import AppLayout from './components/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import { supabase } from './lib/supabase'
import { updateStreak } from './lib/auth'

const Profile         = lazy(() => import('./pages/Profile'))
const PlayerProfile   = lazy(() => import('./pages/PlayerProfile'))
const Chat            = lazy(() => import('./pages/Chat'))
const Streak          = lazy(() => import('./pages/Streak'))
const Settings        = lazy(() => import('./pages/Settings'))
const Ranks           = lazy(() => import('./pages/Ranks'))
const Watch           = lazy(() => import('./pages/Watch'))
const Mall            = lazy(() => import('./pages/Mall'))
const Achievements    = lazy(() => import('./pages/Achievements'))
const Notifications   = lazy(() => import('./pages/Notifications'))
const MultiplayerHome = lazy(() => import('./pages/multiplayer/MultiplayerHome'))

const Fallback = () => (
  <div style={{ color: 'var(--text-dim)', padding: 40, textAlign: 'center' }}>Loading…</div>
)

export default function App() {
  const navigate = useNavigate()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await updateStreak(session.user.id)
        navigate('/dashboard', { replace: true })
      }
    })
    return () => subscription.unsubscribe()
  }, [navigate])

  return (
    <Routes>
      <Route path="/"                element={<Landing />} />
      <Route path="/login"           element={<Login />} />
      <Route path="/signup"          element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/privacy"         element={<Privacy />} />
      <Route path="/terms"           element={<Terms />} />

      {/* Full-screen — no sidebar/topbar */}
      <Route path="/watch" element={<ProtectedRoute><Suspense fallback={<Fallback />}><Watch /></Suspense></ProtectedRoute>} />

      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard"         element={<Dashboard />} />
        <Route path="/coming-soon"       element={<ComingSoon />} />
        <Route path="/games"             element={<Games />} />
        <Route path="/mall"              element={<Suspense fallback={<Fallback />}><Mall /></Suspense>} />
        <Route path="/profile"           element={<Suspense fallback={<Fallback />}><Profile /></Suspense>} />
        <Route path="/profile/:userId"   element={<Suspense fallback={<Fallback />}><PlayerProfile /></Suspense>} />
        <Route path="/chat"              element={<Suspense fallback={<Fallback />}><Chat /></Suspense>} />
        <Route path="/streak"            element={<Suspense fallback={<Fallback />}><Streak /></Suspense>} />
        <Route path="/settings"          element={<Suspense fallback={<Fallback />}><Settings /></Suspense>} />
        <Route path="/ranks"             element={<Suspense fallback={<Fallback />}><Ranks /></Suspense>} />
        <Route path="/achievements"      element={<Suspense fallback={<Fallback />}><Achievements /></Suspense>} />
        <Route path="/notifications"     element={<Suspense fallback={<Fallback />}><Notifications /></Suspense>} />
        <Route path="/multiplayer"       element={<Suspense fallback={<Fallback />}><MultiplayerHome /></Suspense>} />
        <Route path="/multiplayer/:roomId" element={<Suspense fallback={<Fallback />}><MultiplayerHome /></Suspense>} />
      </Route>
    </Routes>
  )
}
