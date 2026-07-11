import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../../shared/lib/supabase'

interface AuthState {
  session: Session | null
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthState | null>(null)

/**
 * Fetches the current Supabase auth session once and subscribes a single
 * onAuthStateChange listener for the whole app, broadcasting updates to
 * every useAuth() consumer via context. Mount this once near the app root
 * (see src/app/main.tsx) — do not nest additional providers.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  const value: AuthState = { session, user: session?.user ?? null, loading }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Reads the current Supabase auth session from the nearest AuthProvider.
 * Safe to call from as many components as needed — it no longer creates
 * its own getSession() call or onAuthStateChange listener per component.
 */
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth() must be called within an <AuthProvider>. Did you forget to wrap the app in src/app/main.tsx?')
  }
  return ctx
}
