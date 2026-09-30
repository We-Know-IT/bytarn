// Google AdSense requires /ads.txt listing the publisher id before it serves
// (and pays for) ads. Generated from NEXT_PUBLIC_ADSENSE_CLIENT (ca-pub-…).
export function GET() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT
  const pub = client?.replace(/^ca-/, '')
  const body = pub ? `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n` : ''
  return new Response(body, {
    status: pub ? 200 : 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
