-- AuraFinds one-shot Supabase setup.
-- Requires the existing public.products, customers, orders, order_items, and
-- webhook_events tables. Run in the Supabase SQL Editor before enabling sales.
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.products') IS NULL
     OR to_regclass('public.customers') IS NULL
     OR to_regclass('public.orders') IS NULL
     OR to_regclass('public.order_items') IS NULL
     OR to_regclass('public.webhook_events') IS NULL THEN
    RAISE EXCEPTION
      'AuraFinds base tables are missing; create products, orders, order_items, and webhook_events before applying setup.sql';
  END IF;
END;
$$;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS rating numeric(2, 1) NOT NULL DEFAULT 5.0,
  ADD COLUMN IF NOT EXISTS stock_quantity integer NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS supplier_id text,
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS cost_price numeric(12, 2),
  ADD COLUMN IF NOT EXISTS compare_at_price numeric(12, 2),
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS full_description_html text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS gallery_images text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS key_highlights text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS specifications jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

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

UPDATE public.products
   SET stock_quantity = 25
 WHERE stock_quantity IS NULL;

ALTER TABLE public.products
  ALTER COLUMN stock_quantity SET DEFAULT 25,
  ALTER COLUMN stock_quantity SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'products_stock_quantity_nonnegative'
       AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_stock_quantity_nonnegative
      CHECK (stock_quantity >= 0);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'products_supplier_sku_key'
       AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_supplier_sku_key UNIQUE (supplier_id, sku);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'products_status_check'
       AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_status_check
      CHECK (status IN ('draft', 'pending_review', 'active'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'products_pipeline_price_check'
       AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_pipeline_price_check
      CHECK (
        (cost_price IS NULL OR cost_price > 0)
        AND (compare_at_price IS NULL OR compare_at_price > 0)
        AND (
          cost_price IS NULL
          OR price >= ceil(cost_price * 2.5 * 100) / 100
        )
      );
  END IF;
END;
$$;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS customer_user_id uuid
    REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS total_amount bigint,
  ADD COLUMN IF NOT EXISTS payment_status text,
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS shipping_details jsonb,
  ADD COLUMN IF NOT EXISTS cj_order_id text,
  ADD COLUMN IF NOT EXISTS fulfillment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS fulfillment_error text,
  ADD COLUMN IF NOT EXISTS fulfillment_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS tracking_carrier text,
  ADD COLUMN IF NOT EXISTS tracking_url text,
  ADD COLUMN IF NOT EXISTS tracking_last_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

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

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS product_id text,
  ADD COLUMN IF NOT EXISTS quantity integer,
  ADD COLUMN IF NOT EXISTS unit_price numeric(12, 2);

ALTER TABLE public.webhook_events
  ADD COLUMN IF NOT EXISTS stripe_event_id text,
  ADD COLUMN IF NOT EXISTS event_type text,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS status text;

ALTER TABLE public.webhook_events
  ALTER COLUMN processed_at DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS orders_stripe_session_id_key
  ON public.orders (stripe_session_id);

CREATE UNIQUE INDEX IF NOT EXISTS orders_cj_order_id_key
  ON public.orders (cj_order_id)
  WHERE cj_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_cj_tracking_poll_idx
  ON public.orders (tracking_last_checked_at NULLS FIRST)
  WHERE fulfillment_status = 'processing' AND cj_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS webhook_events_stripe_event_id_key
  ON public.webhook_events (stripe_event_id);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS products_pipeline_active_read ON public.products;
CREATE POLICY products_pipeline_active_read
  ON public.products FOR SELECT TO anon, authenticated
  USING (status = 'active');
DROP POLICY IF EXISTS products_pipeline_active_only ON public.products;
CREATE POLICY products_pipeline_active_only
  ON public.products AS RESTRICTIVE FOR SELECT TO anon, authenticated
  USING (status = 'active');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'orders'
       AND policyname = 'customers_read_own_orders'
  ) THEN
    CREATE POLICY customers_read_own_orders
      ON public.orders FOR SELECT TO authenticated
      USING (customer_user_id = (SELECT auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'order_items'
       AND policyname = 'customers_read_own_order_items'
  ) THEN
    CREATE POLICY customers_read_own_order_items
      ON public.order_items FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.orders o
           WHERE o.id = order_items.order_id
             AND o.customer_user_id = (SELECT auth.uid())
        )
      );
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.process_stripe_checkout_order(
  text, text, text, text, bigint, text, text, jsonb
);
DROP FUNCTION IF EXISTS public.process_stripe_checkout_order(
  text, text, text, text, uuid, bigint, text, text, jsonb
);

CREATE OR REPLACE FUNCTION public.process_stripe_checkout_order(
  p_stripe_event_id text,
  p_event_type text,
  p_stripe_session_id text,
  p_customer_email text,
  p_customer_user_id uuid,
  p_total_amount bigint,
  p_payment_status text,
  p_currency text,
  p_shipping_details jsonb,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event_status text;
  v_inserted_count integer;
  v_updated_count integer;
  v_order_id public.orders.id%TYPE;
  v_item jsonb;
  v_product_id text;
  v_quantity integer;
  v_unit_price numeric(12, 2);
BEGIN
  IF p_stripe_event_id IS NULL OR p_stripe_session_id IS NULL
     OR p_total_amount IS NULL OR p_total_amount < 0
     OR p_payment_status IS DISTINCT FROM 'paid'
     OR p_currency IS NULL OR p_currency <> 'usd'
     OR p_items IS NULL OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Invalid or unpaid Stripe Checkout order payload';
  END IF;

  INSERT INTO public.webhook_events (
    stripe_event_id, event_type, status, processed_at
  )
  VALUES (p_stripe_event_id, p_event_type, 'processing', NULL)
  ON CONFLICT (stripe_event_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  IF v_inserted_count = 0 THEN
    SELECT status
      INTO v_event_status
      FROM public.webhook_events
     WHERE stripe_event_id = p_stripe_event_id
     FOR UPDATE;

    IF v_event_status IN ('processed', 'ignored') THEN
      SELECT id INTO v_order_id
        FROM public.orders
       WHERE stripe_session_id = p_stripe_session_id;
      RETURN jsonb_build_object('order_id', v_order_id, 'duplicate', true);
    END IF;

    UPDATE public.webhook_events
       SET event_type = p_event_type, status = 'processing', processed_at = NULL
     WHERE stripe_event_id = p_stripe_event_id;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := NULLIF(v_item ->> 'product_id', '');
    v_quantity := (v_item ->> 'quantity')::integer;
    v_unit_price := (v_item ->> 'unit_price')::numeric;

    IF v_product_id IS NULL OR v_quantity IS NULL OR v_quantity < 1
       OR v_quantity > 99 OR v_unit_price IS NULL OR v_unit_price < 0 THEN
      RAISE EXCEPTION 'Invalid Stripe Checkout line item';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.products p WHERE p.id::text = v_product_id
    ) THEN
      RAISE EXCEPTION 'Stripe Checkout references a missing product';
    END IF;
  END LOOP;

  INSERT INTO public.orders (
    stripe_session_id, customer_email, customer_user_id, total_amount,
    payment_status, currency, shipping_details, created_at
  )
  VALUES (
    p_stripe_session_id, p_customer_email, p_customer_user_id,
    p_total_amount, p_payment_status, p_currency, p_shipping_details, now()
  )
  ON CONFLICT (stripe_session_id) DO NOTHING
  RETURNING id INTO v_order_id;

  IF v_order_id IS NULL THEN
    SELECT id INTO v_order_id
      FROM public.orders
     WHERE stripe_session_id = p_stripe_session_id
     FOR UPDATE;

    IF v_order_id IS NULL THEN
      RAISE EXCEPTION 'Could not resolve persisted Stripe order';
    END IF;

    UPDATE public.orders
       SET customer_email = COALESCE(customer_email, p_customer_email),
           customer_user_id = COALESCE(customer_user_id, p_customer_user_id),
           total_amount = p_total_amount,
           payment_status = p_payment_status,
           currency = p_currency,
           shipping_details = COALESCE(shipping_details, p_shipping_details)
     WHERE id = v_order_id;
  ELSE
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
    LOOP
      v_product_id := v_item ->> 'product_id';
      v_quantity := (v_item ->> 'quantity')::integer;

      UPDATE public.products
         SET stock_quantity = stock_quantity - v_quantity
       WHERE id::text = v_product_id
         AND stock_quantity >= v_quantity;

      GET DIAGNOSTICS v_updated_count = ROW_COUNT;
      IF v_updated_count <> 1 THEN
        RAISE EXCEPTION 'Insufficient inventory for product %', v_product_id;
      END IF;
    END LOOP;

    INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
    SELECT
      v_order_id,
      p.id,
      (item.value ->> 'quantity')::integer,
      (item.value ->> 'unit_price')::numeric(12, 2)
    FROM jsonb_array_elements(p_items) AS item(value)
    JOIN public.products p
      ON p.id::text = item.value ->> 'product_id';
  END IF;

  UPDATE public.webhook_events
     SET status = 'processed', processed_at = now()
   WHERE stripe_event_id = p_stripe_event_id;

  RETURN jsonb_build_object('order_id', v_order_id, 'duplicate', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_stripe_webhook_audit(
  p_stripe_event_id text,
  p_event_type text,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_status NOT IN ('failed', 'ignored') THEN
    RAISE EXCEPTION 'Invalid Stripe webhook audit status';
  END IF;

  INSERT INTO public.webhook_events (
    stripe_event_id, event_type, status, processed_at
  )
  VALUES (
    p_stripe_event_id,
    p_event_type,
    p_status,
    CASE WHEN p_status = 'ignored' THEN now() ELSE NULL END
  )
  ON CONFLICT (stripe_event_id) DO UPDATE
     SET event_type = EXCLUDED.event_type,
         status = EXCLUDED.status,
         processed_at = EXCLUDED.processed_at
   WHERE public.webhook_events.status <> 'processed';
END;
$$;

REVOKE ALL ON FUNCTION public.process_stripe_checkout_order(
  text, text, text, text, uuid, bigint, text, text, jsonb, jsonb
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_stripe_webhook_audit(
  text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_stripe_checkout_order(
  text, text, text, text, uuid, bigint, text, text, jsonb, jsonb
) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_stripe_webhook_audit(
  text, text, text
) TO service_role;

-- Initialize products and seed catalog entries. Existing stock is preserved
-- when setup.sql is rerun; review real inventory before accepting orders.
UPDATE public.products
   SET stock_quantity = COALESCE(stock_quantity, 25),
       rating = COALESCE(rating, 5.0),
       category = COALESCE(NULLIF(category, ''), 'Everyday Care'),
       description = COALESCE(
         NULLIF(description, ''),
         'A thoughtfully selected AuraFinds essential, chosen to make everyday life a little more delightful.'
       ),
       image_url = COALESCE(
         NULLIF(image_url, ''),
         'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=1200&q=85'
       );

WITH catalog (
  name, description, price, category, rating, image_url
) AS (
  VALUES
    (
      'Everyday Trail Collar',
      'An adjustable, comfortable collar with durable hardware for neighborhood walks and weekend adventures.',
      24.00, 'Pet Care', 4.9,
      'https://images.unsplash.com/photo-1599443015574-be5fe8a05783?auto=format&fit=crop&w=1200&q=85'
    ),
    (
      'Cloud Nine Pet Bed',
      'A cozy, supportive bed with a plush washable cover and a softly raised edge for curling up after play.',
      79.00, 'Pet Care', 4.9,
      'https://images.unsplash.com/photo-1541599540903-216a46ca1dc0?auto=format&fit=crop&w=1200&q=85'
    ),
    (
      'Wiggle & Wonder Puzzle',
      'An enrichment toy that turns snack time into a satisfying challenge and encourages curious noses to explore.',
      21.00, 'Pet Care', 4.8,
      'https://images.unsplash.com/photo-1535294435445-d7249524ef2e?auto=format&fit=crop&w=1200&q=85'
    ),
    (
      'Gentle Groom Brush',
      'A comfortable grooming brush with flexible pins that helps lift loose fur and makes quiet care time easier.',
      19.00, 'Pet Care', 4.8,
      'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=1200&q=85'
    ),
    (
      'Dewdrop Hydrating Serum',
      'A lightweight daily serum for a fresh, dewy-feeling skincare routine. Apply a few drops after cleansing.',
      28.00, 'Beauty & Skincare', 4.8,
      'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=1200&q=85'
    ),
    (
      'Cooling Facial Roller',
      'A smooth facial massage roller designed to add a relaxing, refreshing moment to your morning or evening routine.',
      18.00, 'Beauty & Skincare', 4.7,
      'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=85'
    ),
    (
      'Daily Glow Essentials Set',
      'A simple, travel-friendly collection of skincare essentials for a fresh and easy daily care ritual.',
      36.00, 'Beauty & Skincare', 4.8,
      'https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=1200&q=85'
    ),
    (
      'PocketBeam Mini Projector',
      'A compact smart projector for turning a blank wall into a cozy movie-night screen at home or away.',
      119.00, 'Smart Tech & Gadgets', 4.7,
      'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=85'
    ),
    (
      'SnapCharge Wireless Stand',
      'A clean, space-saving wireless charging stand that keeps a compatible phone visible and within easy reach.',
      39.00, 'Smart Tech & Gadgets', 4.8,
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=85'
    ),
    (
      'Halo Ambient Smart Light',
      'A soft-glow smart lamp for winding down, setting a calmer mood, or adding a warm accent to your desk.',
      49.00, 'Smart Tech & Gadgets', 4.6,
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=85'
    )
)
INSERT INTO public.products (
  name, description, price, category, rating, image_url, stock_quantity
)
SELECT
  catalog.name,
  catalog.description,
  catalog.price,
  catalog.category,
  catalog.rating,
  catalog.image_url,
  25
FROM catalog
WHERE NOT EXISTS (
  SELECT 1
    FROM public.products existing
   WHERE lower(existing.name) = lower(catalog.name)
);

DO $$
DECLARE
  v_product_count integer;
BEGIN
  SELECT count(*) INTO v_product_count FROM public.products;
  IF v_product_count < 10 THEN
    RAISE EXCEPTION 'Catalog seed incomplete: expected at least 10 products, found %', v_product_count;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.products
     WHERE stock_quantity IS NULL
        OR stock_quantity < 0
        OR rating IS NULL
        OR category IS NULL
        OR description IS NULL
        OR image_url IS NULL
        OR price IS NULL
        OR price <= 0
  ) THEN
    RAISE EXCEPTION 'Catalog contains products missing required display, price, or inventory data';
  END IF;
END;
$$;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  body text NOT NULL CHECK (char_length(body) BETWEEN 10 AND 2000),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_reviews_one_per_user UNIQUE (product_id, user_id)
);

CREATE INDEX IF NOT EXISTS product_reviews_approved_product_created_idx
  ON public.product_reviews (product_id, created_at DESC)
  WHERE status = 'approved';

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_reviews_public_read ON public.product_reviews;
CREATE POLICY product_reviews_public_read
  ON public.product_reviews FOR SELECT TO anon, authenticated
  USING (status = 'approved');
DROP POLICY IF EXISTS product_reviews_customer_insert ON public.product_reviews;
CREATE POLICY product_reviews_customer_insert
  ON public.product_reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

GRANT SELECT ON public.product_reviews TO anon, authenticated;
GRANT INSERT ON public.product_reviews TO authenticated;

COMMIT;
