This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Backend setup (Supabase)

The app has no mock data — without a configured backend, listing pages show empty states. To connect one:

1. Create a [Supabase](https://supabase.com) project.
2. Run `supabase/schema.sql` against it (SQL editor, or `supabase db push`) — this creates the
   `profiles`, `listings`, `favorites`, `saved_searches`, `conversations` and `messages` tables
   with row-level security policies.
3. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your project's API settings, plus
   `SUPABASE_SERVICE_ROLE_KEY` (needed for BankID account provisioning).
4. Restart `npm run dev`. Auth (email/password), listings, and profiles now read and write to
   Supabase.

`supabase/schema.sql` is the full schema for a new project. For an existing database, run the
migrations in `supabase/migrations/` in order instead (each is idempotent and wrapped in a
transaction). `20260929_v2.sql` adds listing video (`listing-videos` bucket, 100 MB), view counts,
listing expiry, family accounts, admin moderation and SMTP settings, and fixes the recursive RLS
policies between `listings` and `listing_collaborators` that made reading and publishing listings
fail. It does not change or end any existing listing.

### Listing lifecycle and cleanup

Listings are live for 60 days (`expires_at`) and can be renewed from **Annonshanteraren**
(`/annonshanterare`). Existing listings get 60 days from when the migration runs. Expired listings
are hidden from the feed immediately, and `expire_stale_listings()` marks them `avslutad` — nightly
if `pg_cron` is enabled when the migration runs, or on demand from `/admin` ("Städa utgångna
annonser"). To retire old listings right away, use `supabase/cleanup_old_listings.sql` (preview
first, then an opt-in update; nothing is deleted).

### Admins

Grant admin rights from the SQL editor (the client can't change this column):

```sql
update profiles set is_admin = true where id = '<user-id>';
```

Admins get `/admin` (stats, reports, bulk end/delete of any listing) and
`/admin/installningar` (SMTP settings).

### BankID login

BankID sign-in goes through [Idura Verify](https://docs.idura.app/verify/e-ids/swedish-bankid/)
(formerly Criipto), a hosted OIDC broker, using the Authorization Code Flow. Fill in
`IDURA_DOMAIN`, `IDURA_CLIENT_ID`, `IDURA_CLIENT_SECRET` and `NEXT_PUBLIC_APP_URL` in
`.env.local` to enable the "Logga in med BankID" buttons on the login/register pages. The older
`CRIIPTO_*` names still work as a fallback.

Idura application settings the code expects: OAuth2 Code Flow on, dynamic scopes off (the app
sends `scope=openid` and relies on the per-eID scope configuration), and the callback URL
`${NEXT_PUBLIC_APP_URL}/api/auth/bankid/callback` registered. The personal identity number is
read from the `ssn` claim and only stored as a SHA-256 hash.

### Email (SMTP / Gmail)

Bytaren sends household invites and new-message notifications over SMTP. Configure it either with
`SMTP_*` env vars (see `.env.example`; these take precedence and make the admin form read-only) or
at `/admin/installningar` (admins only). Settings are stored in the `smtp_settings` table, which
only the service role can read; the password is never sent back to the browser.

For Gmail: host `smtp.gmail.com`, port 465 (SSL) or 587 (STARTTLS), the full Gmail/Workspace
address as username, and a 16-character **App Password** (enable 2-step verification, then create
one at https://myaccount.google.com/apppasswords) — your normal Google password won't work. The
From address must be the Gmail address or a verified "Send mail as" alias. Use "Skicka testmejl" to
verify.

Supabase Auth's own emails (signup confirmation, password reset) are configured separately under
Supabase Dashboard → Authentication → SMTP Settings — use the same Gmail values there.

Without SMTP everything still works: invites show a copyable link and notifications are skipped.
Users can opt out of message emails via `profiles.notify_email`; only the first unread message per
conversation triggers an email.

### Family accounts (`/familj`)

People who live together can join one household (familjekonto). Every member can edit, pause,
renew and delete every other member's listings, so a family or sambos can run their swap together.
The owner invites members by email; invitees accept at `/familj/acceptera?token=…` and must sign in
with the invited address. A user can be in one household at a time and can leave at any time; if
the owner leaves, the longest-standing member takes over.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
