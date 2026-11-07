# PawNest Store

A small pet-products storefront built with Next.js, Supabase, and Zustand.

## Shopping cart

The cart groups products by ID, supports quantity changes and item removal,
shows a subtotal, and is saved in the browser so it remains available after
refreshing the page. Checkout is intentionally unavailable until a checkout
provider or order-processing endpoint is configured.

## Run locally

Install dependencies with `npm install`, then start the development server:

```sh
npm run dev
```

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in
`.env.local`. The storefront reads its catalog from the existing Supabase
`products` table, including `id`, `name`, and `price`; `description`,
`category`, and `image_url` are optional display fields.
