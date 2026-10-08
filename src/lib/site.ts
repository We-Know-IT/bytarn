import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Canonical site address (punycode for hyresvägen.se). Overridden by
// NEXT_PUBLIC_APP_URL so previews link to themselves.
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://xn--hyresvgen-02a.se').replace(/\/+$/, '')

// Cookie-less anon client for public, cacheable server reads (sitemap,
// link previews). Only sees what anonymous visitors see under RLS.
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
