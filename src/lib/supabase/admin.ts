import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Service-role client — server-only, never import this from client components.
// Used to provision accounts for BankID sign-ins, where there is no password
// the user could authenticate with directly.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY saknas — kan inte skapa admin-klient.')
  }
  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
