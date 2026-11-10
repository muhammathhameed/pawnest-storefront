# PawNest Store

A small pet-products storefront built with Next.js, Supabase, and Zustand.

## Shopping cart

The cart groups products by ID, supports quantity changes and item removal,
shows a subtotal, and is saved in the browser so it remains available after
refreshing the page. Checkout is completed securely through Stripe.

## Run locally

Install dependencies with `npm install`, then start the development server:

```sh
npm run dev
```

Set the following environment variables in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
# Required in production; development can use the current request origin.
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Keep the service-role, Stripe secret, and webhook signing keys server-only.
The storefront reads its catalog from the existing Supabase `products` table,
including `id`, `name`, and `price`; `description`, `category`, and `image_url`
are optional display fields.

## Stripe Checkout

Configure these Stripe values in `.env.local` (see the full environment
variable list above):

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_SERVICE_ROLE_KEY=...
# Required in production; development can use the current request origin:
NEXT_PUBLIC_SITE_URL=https://your-store.example
```

Checkout creates an authenticated Stripe-hosted payment session using product
prices fetched from Supabase. Use Stripe test keys while testing. The Checkout Session returns
customers to `/success` after payment or `/cancel` if they cancel. In
production, `NEXT_PUBLIC_SITE_URL` must be the public HTTPS origin of the
storefront; local development can use the request origin automatically.

The webhook uses the server-only Supabase service-role key and restricted
database functions. Apply
[`supabase/setup.sql`](./supabase/setup.sql) once in the Supabase SQL Editor to
consolidate the schema changes from the three migrations and seed the catalog.
It expects the existing `products`, `customers`, `orders`, `order_items`, and
`webhook_events` tables, with `orders.id` as the primary key and
`order_items.order_id` referencing it. It adds Stripe order/event fields and
unique session/event indexes; resolve any pre-existing duplicate Stripe
session or event IDs before applying it. `orders.total_amount` is stored in
cents; `order_items.unit_price` is stored in dollars. Review stock counts
before launch; rerunning the setup preserves existing inventory. Checkout
rejects insufficient stock and the paid webhook atomically decrements inventory
with the order and event writes. The browser's persisted Zustand cart is
cleared on the paid success page; this project does not maintain a separate
server-side cart-session table.

### Supabase Auth

Enable Email provider in Supabase Authentication settings. Configure the
project Site URL and allow redirect URLs for
`http://localhost:3000/auth/callback` and your deployed
`https://<domain>/auth/callback`. Signup uses email confirmation when enabled;
the login page also supports passwordless magic links. Protected account and
checkout routes require a valid Supabase Auth session.

### Vercel deployment

Connect the repository to Vercel and add the environment values above to the
Development, Preview, and Production environments as appropriate. Do not set
`NEXT_PUBLIC_SITE_URL` to localhost in production. Deploy only after applying
the Supabase migrations and seed, setting real inventory, and configuring the
Stripe webhook for the production URL. `.vercelignore` excludes local secrets,
dependencies, and generated build output; `.vercel/` stays local and is ignored
by Git.

### Configure Stripe webhooks

For local development, forward Stripe test events to the app:

```sh
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the printed `whsec_...` signing secret into `STRIPE_WEBHOOK_SECRET` and
restart the app. In the Stripe Dashboard, add
`https://your-store.example/api/webhooks/stripe` as a webhook endpoint and
subscribe to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`

Set `STRIPE_WEBHOOK_SECRET` to that endpoint's signing secret. Never expose
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, or
`SUPABASE_SERVICE_ROLE_KEY` to browser code or commit them to source control.
The success page retrieves the Checkout Session directly from Stripe; order
creation is finalized by the webhook and remains safe to retry.

## Dropship engine (Phase 2)

Paid orders flow through a Postgres-backed pipeline: Stripe webhook →
`finalize_dropship_order` (order lines + ship-to) → `order.route` job (pick
suppliers, split into one purchase order per supplier) → `po.place` job (send
to the supplier, blind by default) → supplier/17TRACK webhooks drive
`Unfulfilled → PO placed → Partially shipped/Shipped → Delivered / Exception`.

**Setup**

1. Apply, in order, `supabase/migrations/20261108000100_dropship_core.sql` and
   `20261108000200_dropship_finalize.sql` (they are not part of `setup.sql`).
2. Add the dropship variables from `.env.example`.
3. Insert suppliers and `supplier_offers` (one row per supplier and variant, with
   cost, stock and priority). Products with no offers stay self-managed and
   behave exactly as before.
4. Schedule the worker: call `GET /api/jobs/run` with
   `Authorization: Bearer $CRON_SECRET` every minute. On Vercel Pro:
   `"crons": [{ "path": "/api/jobs/run", "schedule": "* * * * *" }]` in
   `vercel.json`. Hobby plans only allow daily crons, so use an external
   scheduler there.
5. Register `/api/webhooks/17track` in the 17TRACK dashboard and give each
   supplier `/api/webhooks/supplier/<code>`.

**Supplier webhook** (signed with `x-signature`, hex HMAC-SHA256 of the raw
body, secret named by `suppliers.webhook_secret_ref`, which must start with
`SUPPLIER_`): `inventory` (`items: [{sku, stock, cost_cents?, currency?}]`),
`shipment` (`reference` = our PO id, `tracking_number`, `carrier`) and
`po.rejected` (`reference`, `reason`).

**Pricing**: edit `markup_rules` (cost brackets, multiplier, flat amount). The
seeded third bracket ($50 and up, 1.6x) is a placeholder; review it.

Run the unit tests with `npm test`.
