ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS rating numeric(2, 1) NOT NULL DEFAULT 5.0;

ALTER TABLE public.products
  ALTER COLUMN stock_quantity SET DEFAULT 25;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

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

REVOKE ALL ON FUNCTION public.process_stripe_checkout_order(
  text, text, text, text, uuid, bigint, text, text, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_stripe_checkout_order(
  text, text, text, text, uuid, bigint, text, text, jsonb
) TO service_role;
