/** Absolute base URL for links in emails: NEXT_PUBLIC_APP_URL, else the request's origin. */
export function appBaseUrl(requestOrigin: string, env: Record<string, string | undefined> = process.env): string {
  const configured = env.NEXT_PUBLIC_APP_URL?.trim()
  return (configured || requestOrigin).replace(/\/+$/, '')
}
