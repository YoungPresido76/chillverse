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

// These pages will be created; lazy-load so missing files don't crash the app
const Profile = lazy(() => import('./pages/Profile'))
const Chat = lazy(() => import('./pages/Chat'))

export default function App() {
  const navigate = useNavigate()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/dashboard', { replace: true })
      }
    })
    return () => subscription.unsubscribe()
  }, [navigate])

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />

      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/coming-soon" element={<ComingSoon />} />
        <Route path="/games" element={<Games />} />
        <Route
          path="/profile"
          element={
            <Suspense fallback={<div style={{ color: 'var(--text-dim)', padding: 40, textAlign: 'center' }}>Loading…</div>}>
              <Profile />
            </Suspense>
          }
        />
        <Route
          path="/chat"
          element={
            <Suspense fallback={<div style={{ color: 'var(--text-dim)', padding: 40, textAlign: 'center' }}>Loading…</div>}>
              <Chat />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  )
}
