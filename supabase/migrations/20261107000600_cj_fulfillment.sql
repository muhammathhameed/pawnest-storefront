BEGIN;

CREATE TABLE IF NOT EXISTS public.product_cj_variants (
  product_id text PRIMARY KEY,
  cj_variant_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_cj_variants_product_id_nonempty
    CHECK (length(product_id) > 0),
  CONSTRAINT product_cj_variants_cj_variant_id_nonempty
    CHECK (length(cj_variant_id) BETWEEN 1 AND 50)
);

ALTER TABLE public.product_cj_variants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.product_cj_variants FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.product_cj_variants TO service_role;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cj_order_id text,
  ADD COLUMN IF NOT EXISTS fulfillment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS fulfillment_error text,
  ADD COLUMN IF NOT EXISTS fulfillment_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS tracking_carrier text,
  ADD COLUMN IF NOT EXISTS tracking_url text,
  ADD COLUMN IF NOT EXISTS tracking_last_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'orders_fulfillment_status_check'
       AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_fulfillment_status_check
      CHECK (
        fulfillment_status IN (
          'pending',
          'submitting',
          'processing',
          'shipped',
          'failed'
        )
      );
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS orders_cj_order_id_key
  ON public.orders (cj_order_id)
  WHERE cj_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_cj_tracking_poll_idx
  ON public.orders (tracking_last_checked_at NULLS FIRST)
  WHERE fulfillment_status = 'processing' AND cj_order_id IS NOT NULL;

COMMIT;
