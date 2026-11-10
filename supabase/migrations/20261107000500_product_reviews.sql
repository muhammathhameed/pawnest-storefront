ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_details jsonb;

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
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
  );

GRANT SELECT ON public.product_reviews TO anon, authenticated;
GRANT INSERT ON public.product_reviews TO authenticated;

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

REVOKE ALL ON FUNCTION public.process_stripe_checkout_order(
  text, text, text, text, uuid, bigint, text, text, jsonb, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_stripe_checkout_order(
  text, text, text, text, uuid, bigint, text, text, jsonb, jsonb
) TO service_role;
