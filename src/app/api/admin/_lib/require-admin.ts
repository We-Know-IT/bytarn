import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createClient, supabaseConfigured } from '@/lib/supabase/server'

export type AdminCheck = { ok: true; user: User } | { ok: false; response: NextResponse }

/**
 * Verifies the caller is signed in (cookie session) and has
 * profiles.is_admin = true. Use before touching anything with the
 * service-role client.
 */
export async function requireAdmin(): Promise<AdminCheck> {
  if (!supabaseConfigured) {
    return { ok: false, response: NextResponse.json({ error: 'Supabase är inte konfigurerat.' }, { status: 503 }) }
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Du måste vara inloggad.' }, { status: 401 }) }
  }
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (!profile?.is_admin) {
    return { ok: false, response: NextResponse.json({ error: 'Endast administratörer har åtkomst.' }, { status: 403 }) }
  }
  return { ok: true, user }
}
