# AuraFinds OMS (admin portal)

Standalone Next.js app for internal operations. It shares the storefront's
Supabase project; being a Supabase Auth user grants nothing here, only an
active row in `admin_users` does.

## Setup
1. Apply `supabase/migrations/20261110000100_oms_rbac_audit.sql`.
2. Deploy this folder as its own Vercel project (Root Directory `apps/oms`,
   enable "Include source files outside of the Root Directory") with the env
   vars in `.env.example`.
3. Create your own account in Supabase Auth, then in the SQL editor run once:
   `select public.bootstrap_first_super_admin('<your auth user id>', '<your email>');`
   It refuses to run again once any admin exists.
4. Sign in at `/login`; add teammates under **Admins**.

RBAC lives in `packages/shared/src/rbac.ts` (tests in `packages/shared/__tests__`).
Every privileged action must call `requirePermission(...)` and `audit(...)`.
