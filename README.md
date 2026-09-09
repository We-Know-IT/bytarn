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

The app runs on demo/mock data until a real backend is configured. To connect one:

1. Create a [Supabase](https://supabase.com) project.
2. Run `supabase/schema.sql` against it (SQL editor, or `supabase db push`) — this creates the
   `profiles`, `listings`, `favorites`, `saved_searches`, `conversations` and `messages` tables
   with row-level security policies.
3. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your project's API settings, plus
   `SUPABASE_SERVICE_ROLE_KEY` (needed for BankID account provisioning).
4. Restart `npm run dev`. Auth (email/password), listings, and profiles now read and write to
   Supabase instead of the mock data in `src/lib/mock-data.ts`.

### BankID login

BankID sign-in goes through [Criipto Verify](https://docs.criipto.com/verify/e-ids/sweden-bankid/),
a hosted broker — going live requires a Criipto account with the Sweden BankID add-on (real BankID
access needs a bank-issued agreement Criipto already holds; there's no way to test this without
that account). Fill in `CRIIPTO_DOMAIN`, `CRIIPTO_CLIENT_ID`, `CRIIPTO_CLIENT_SECRET` and
`NEXT_PUBLIC_APP_URL` in `.env.local` to enable the "Logga in med BankID" buttons on the
login/register pages.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
