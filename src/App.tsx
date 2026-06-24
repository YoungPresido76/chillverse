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

const Profile       = lazy(() => import('./pages/Profile'))
const PlayerProfile = lazy(() => import('./pages/PlayerProfile'))
const Chat          = lazy(() => import('./pages/Chat'))
const Streak        = lazy(() => import('./pages/Streak'))
const Settings      = lazy(() => import('./pages/Settings'))
const Ranks         = lazy(() => import('./pages/Ranks'))
const Watch         = lazy(() => import('./pages/Watch'))

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

      {/* Standalone full-screen experience — no sidebar/topbar chrome */}
      <Route path="/watch" element={<ProtectedRoute><Suspense fallback={<Fallback />}><Watch /></Suspense></ProtectedRoute>} />

      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/coming-soon" element={<ComingSoon />} />
        <Route path="/games"     element={<Games />} />
        <Route path="/profile"            element={<Suspense fallback={<Fallback />}><Profile /></Suspense>} />
        <Route path="/profile/:userId"    element={<Suspense fallback={<Fallback />}><PlayerProfile /></Suspense>} />
        <Route path="/chat"               element={<Suspense fallback={<Fallback />}><Chat /></Suspense>} />
        <Route path="/streak"    element={<Suspense fallback={<Fallback />}><Streak /></Suspense>} />
        <Route path="/settings"  element={<Suspense fallback={<Fallback />}><Settings /></Suspense>} />
        <Route path="/ranks"     element={<Suspense fallback={<Fallback />}><Ranks /></Suspense>} />
      </Route>
    </Routes>
  )
}
