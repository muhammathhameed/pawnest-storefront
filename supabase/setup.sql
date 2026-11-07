-- PawNest one-shot Supabase setup.
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
      'PawNest base tables are missing; create products, orders, order_items, and webhook_events before applying setup.sql';
  END IF;
END;
$$;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS rating numeric(2, 1) NOT NULL DEFAULT 5.0,
  ADD COLUMN IF NOT EXISTS stock_quantity integer NOT NULL DEFAULT 25;

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

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS customer_user_id uuid
    REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS total_amount bigint,
  ADD COLUMN IF NOT EXISTS payment_status text,
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

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

CREATE UNIQUE INDEX IF NOT EXISTS webhook_events_stripe_event_id_key
  ON public.webhook_events (stripe_event_id);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

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

CREATE OR REPLACE FUNCTION public.process_stripe_checkout_order(
  p_stripe_event_id text,
  p_event_type text,
  p_stripe_session_id text,
  p_customer_email text,
  p_customer_user_id uuid,
  p_total_amount bigint,
  p_payment_status text,
  p_currency text,
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
    payment_status, currency, created_at
  )
  VALUES (
    p_stripe_session_id, p_customer_email, p_customer_user_id,
    p_total_amount, p_payment_status, p_currency, now()
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
           currency = p_currency
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
  text, text, text, text, uuid, bigint, text, text, jsonb
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_stripe_webhook_audit(
  text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_stripe_checkout_order(
  text, text, text, text, uuid, bigint, text, text, jsonb
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
         'A thoughtfully selected PawNest essential made to bring comfort, care, and a little more joy to your pet’s everyday routine.'
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
      'A soft, adjustable walking collar made for everyday adventures. Durable hardware and a comfortable finish keep every outing easy.',
      24.00, 'Collars & Leashes', 4.9,
      'https://images.unsplash.com/photo-1599443015574-be5fe8a05783?auto=format&fit=crop&w=1200&q=85'
    ),
    (
      'Rope Walk Leash',
      'A sturdy, easy-grip rope leash with a lightweight clasp and a relaxed feel in your hand, from neighborhood strolls to weekend trails.',
      32.00, 'Collars & Leashes', 4.8,
      'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&w=1200&q=85'
    ),
    (
      'Cloud Nine Pet Bed',
      'A cozy, supportive bed with a plush washable cover and a gently raised edge for curling up after a long day of play.',
      79.00, 'Beds & Furniture', 4.9,
      'https://images.unsplash.com/photo-1541599540903-216a46ca1dc0?auto=format&fit=crop&w=1200&q=85'
    ),
    (
      'Window Perch Lounge',
      'A comfortable perch that gives curious cats a sunny spot to watch the world, nap, and stretch out in style.',
      58.00, 'Beds & Furniture', 4.7,
      'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1200&q=85'
    ),
    (
      'Wiggle & Wonder Puzzle',
      'An enrichment toy that turns snack time into a satisfying little challenge and encourages curious noses to keep exploring.',
      21.00, 'Interactive Toys', 4.8,
      'https://images.unsplash.com/photo-1535294435445-d7249524ef2e?auto=format&fit=crop&w=1200&q=85'
    ),
    (
      'Tug Time Play Rope',
      'A textured, easy-to-grab rope toy for energetic games of tug and fetch together. Made for supervised play.',
      16.00, 'Interactive Toys', 4.6,
      'https://images.unsplash.com/photo-1535930749574-1399327ce78f?auto=format&fit=crop&w=1200&q=85'
    ),
    (
      'Stoneware Slow Bowl',
      'A stable ceramic bowl with a gentle maze design that makes mealtimes more engaging and is easy to clean.',
      29.00, 'Bowls & Feeding', 4.9,
      'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&w=1200&q=85'
    ),
    (
      'Double Diner Feeding Set',
      'A thoughtfully sized pair of everyday bowls in a sturdy raised stand, keeping food and fresh water close at hand.',
      46.00, 'Bowls & Feeding', 4.7,
      'https://images.unsplash.com/photo-1601758123927-196e5c4c7f87?auto=format&fit=crop&w=1200&q=85'
    ),
    (
      'Gentle Groom Brush',
      'A comfortable grooming brush with soft, flexible pins that helps lift loose fur and makes quiet care time a little easier.',
      19.00, 'Grooming', 4.8,
      'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=1200&q=85'
    ),
    (
      'Fresh Coat Care Kit',
      'A simple at-home grooming set with everyday essentials for keeping coats tidy between professional grooming visits.',
      38.00, 'Grooming', 4.6,
      'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1200&q=85'
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

COMMIT;
