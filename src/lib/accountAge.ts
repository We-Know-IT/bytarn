// An account created in the last few minutes was created by this sign-in.
// Used to tell "Registrera med Google" on an existing email (Supabase signs
// into that account) apart from a genuinely new account.
export const NEW_ACCOUNT_WINDOW_MS = 10 * 60 * 1000

export function isNewAccount(createdAt: string | undefined | null, now = Date.now()): boolean {
  if (!createdAt) return false
  const age = now - new Date(createdAt).getTime()
  return age >= 0 && age < NEW_ACCOUNT_WINDOW_MS
}
