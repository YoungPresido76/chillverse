import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigError =
  !supabaseUrl || !supabaseAnonKey
    ? 'Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (copy .env.example to .env.local for local dev).'
    : null

if (supabaseConfigError) {
  // eslint-disable-next-line no-console
  console.error(supabaseConfigError)
}

// Placeholders prevent createClient from throwing synchronously at import time
// (which would crash the whole app before React even mounts). Real failures
// get surfaced as a controlled screen via supabaseConfigError in App.tsx instead.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
)

