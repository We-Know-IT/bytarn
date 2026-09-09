import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

export const supabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// A single shared browser client — creating a fresh GoTrueClient per call means
// each one keeps its own in-memory session, so a sign-in in one place (e.g. the
// register form) doesn't reliably notify listeners set up elsewhere (e.g. the
// navbar's auth state), and the console warns about multiple GoTrueClient
// instances. Memoizing avoids both.
let browserClient: SupabaseClient | undefined

export function createClient() {
  if (!supabaseConfigured) {
    throw new Error(
      'Supabase är inte konfigurerat. Sätt NEXT_PUBLIC_SUPABASE_URL och NEXT_PUBLIC_SUPABASE_ANON_KEY i .env.local.'
    )
  }
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return browserClient
}
