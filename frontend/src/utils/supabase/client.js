import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Null when Supabase env vars are missing; callers fall back to backend auth.
export const supabase = supabaseUrl && supabaseKey ? createBrowserClient(supabaseUrl, supabaseKey) : null
