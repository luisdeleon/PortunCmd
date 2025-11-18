import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create supabase client only if env vars are available
// This prevents the app from crashing if env vars are missing during development
let supabase: ReturnType<typeof createClient<Database>>

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables - authentication features will not work')
  // Create a dummy client to prevent errors
  supabase = createClient<Database>('https://placeholder.supabase.co', 'placeholder-key')
} else {
  supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      // Persist session in localStorage for "Remember me" functionality
      persistSession: true,
      // Automatically refresh session when access token expires
      autoRefreshToken: true,
      // Detect session in URL (for magic links, OAuth, etc.)
      detectSessionInUrl: true,
      // Use localStorage for session storage (persists across browser sessions)
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  })
}

export { supabase }

