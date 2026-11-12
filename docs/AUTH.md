# Authentication (Supabase only)

One auth system: Supabase Auth (PKCE) via `@supabase/ssr`. NextAuth and the in-memory `/api/auth` registry were removed.

## Required configuration (values to set)
**Vercel env (Production + Preview):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only, never `NEXT_PUBLIC_`). `NEXT_PUBLIC_SITE_URL=https://pawnest-storefront.vercel.app`.
Unused now: `NEXTAUTH_SECRET`, `AUTH_SECRET`, `AUTH_GOOGLE_*`, `AUTH_MICROSOFT_*` can be deleted.

**Supabase → Authentication → URL Configuration**
- Site URL: `https://pawnest-storefront.vercel.app`
- Redirect URLs: `https://pawnest-storefront.vercel.app/**`, `http://localhost:3000/**` (add the OMS URL separately if it shares the project).
  If the callback URL is not allow-listed Supabase falls back to Site URL; middleware forwards a stray `?code=` to `/auth/callback`, but fix the list anyway.

**Google** (Cloud Console → Credentials → OAuth client, Web): Authorized redirect URI `https://eixgomprkbiddxavgttg.supabase.co/auth/v1/callback`; paste Client ID/Secret into Supabase → Providers → Google.

**Microsoft (Supabase provider "Azure")**
- Entra → App registrations → Redirect URI (Web): `https://eixgomprkbiddxavgttg.supabase.co/auth/v1/callback`
- Supported account types: "Accounts in any organizational directory and personal Microsoft accounts" (needed for Outlook/Hotmail).
- Supabase → Providers → Azure: Application (client) ID, Client secret **Value** (not the Secret ID), and **Azure Tenant URL**: leave empty or use `common`.
  The reported 404 URL `login.microsoftonline.com/<tenant-guid>/v2.0/oauth2/v2.0/authorize` indicates the tenant URL was entered with a `/v2.0` suffix or the app is single-tenant for another directory. Use `https://login.microsoftonline.com/common` (no `/v2.0`) and a multi-tenant+personal registration.
- Secret expiry: Entra secrets expire; renew before expiry.

**Email auth:** Supabase → Auth → Providers → Email enabled; Email templates use `{{ .ConfirmationURL }}` (default). For production configure custom SMTP (default sender is heavily rate limited).

**Database:** apply `supabase/migrations/20261112000100_auth_profiles.sql` (profiles table, signup trigger, RLS). Make an admin: `update public.profiles set role='admin' where email='you@example.com';`

## Flow
`/login`, `/signup` (AuthForm: email+password, magic link, Google, Microsoft) → `/auth/callback` (exchangeCodeForSession or verifyOtp; cookies on the redirect response; `next` validated as same-origin relative path) → destination. Password reset: `/forgot-password` → email → `/auth/callback?next=/reset-password` → `/reset-password`.
Middleware refreshes the session with `getUser()`, protects `/account/*`, `/profile`, `/admin/*` (admin requires `profiles.role` in admin/super_admin, enforced server side), and redirects signed-in users away from `/login`.

## Customer account (feature/customer-account-redesign)
Apply `supabase/migrations/20261112000200_customer_account.sql` after the profiles migration (addresses, wishlist, avatar bucket, phone, notification prefs). Account deletion needs `SUPABASE_SERVICE_ROLE_KEY` on Vercel. Routes: `/account`, `/account/{orders,wishlist,addresses,profile,notifications,security}`; header dropdown: `components/account/AccountDropdown.tsx`.
