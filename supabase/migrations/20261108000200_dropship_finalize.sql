-- Bridges a paid Stripe order into the dropship pipeline without touching the
-- existing process_stripe_checkout_order function.
--
-- finalize_dropship_order is idempotent: it can run from the webhook, from a
-- retry, or from the sweep job, and always converges to the same state.

CREATE OR REPLACE FUNCTION public.finalize_dropship_order(
  p_order_id text,
  p_shipping jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order_id public.orders.id%TYPE;
  v_lines integer;
  v_missing integer;
BEGIN
  v_order_id := p_order_id;

  PERFORM 1 FROM public.orders WHERE id = v_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  IF p_shipping IS NOT NULL AND jsonb_typeof(p_shipping) = 'object' THEN
    UPDATE public.orders
       SET shipping_name = COALESCE(shipping_name, p_shipping ->> 'name'),
           shipping_phone = COALESCE(shipping_phone, p_shipping ->> 'phone'),
           shipping_address = COALESCE(shipping_address, p_shipping -> 'address')
     WHERE id = v_order_id;
  END IF;

  -- Map each purchased product to its (default) variant. A product with
  -- several variants must be mapped explicitly by the checkout flow once
  -- variant selection exists; until then the default variant is used.
  INSERT INTO public.order_lines (
    order_id, product_id, variant_id, sku, title, quantity, unit_price_cents,
    currency
  )
  SELECT
    oi.order_id,
    oi.product_id::text,
    v.id,
    v.sku,
    p.name,
    oi.quantity,
    round(oi.unit_price * 100)::integer,
    'USD'
  FROM public.order_items oi
  JOIN public.products p ON p.id::text = oi.product_id::text
  JOIN LATERAL (
    SELECT pv.id, pv.sku
      FROM public.product_variants pv
     WHERE pv.product_id::text = oi.product_id::text
     ORDER BY pv.created_at, pv.id
     LIMIT 1
  ) v ON true
  WHERE oi.order_id = v_order_id
  ON CONFLICT (order_id, variant_id) DO NOTHING;

  SELECT count(*) INTO v_lines
    FROM public.order_lines WHERE order_id = v_order_id;

  SELECT count(*) INTO v_missing
    FROM public.order_items oi
   WHERE oi.order_id = v_order_id
     AND NOT EXISTS (
       SELECT 1 FROM public.order_lines ol
        WHERE ol.order_id = v_order_id AND ol.product_id = oi.product_id::text
     );

  IF v_lines = 0 OR v_missing > 0 THEN
    RAISE EXCEPTION 'order_lines_incomplete';
  END IF;

  PERFORM public.enqueue_job(
    'order.route',
    jsonb_build_object('orderId', v_order_id::text),
    now(),
    'order.route:' || v_order_id::text
  );

  RETURN jsonb_build_object('order_id', v_order_id, 'lines', v_lines);
END;
$$;

-- Orders that were paid but never finalized (webhook crashed between steps).
CREATE OR REPLACE FUNCTION public.find_unfinalized_orders(p_limit integer DEFAULT 25)
RETURNS TABLE (order_id text, stripe_session_id text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT o.id::text, o.stripe_session_id
    FROM public.orders o
   WHERE o.payment_status = 'paid'
     AND o.fulfillment_status = 'unfulfilled'
     AND o.created_at < now() - interval '2 minutes'
     AND NOT EXISTS (SELECT 1 FROM public.order_lines l WHERE l.order_id = o.id)
   ORDER BY o.created_at
   LIMIT GREATEST(p_limit, 1);
$$;

-- Paid orders still waiting for a PO after a while (no route job in flight).
CREATE OR REPLACE FUNCTION public.find_stuck_unrouted_orders(
  p_older_than_minutes integer DEFAULT 15,
  p_limit integer DEFAULT 25
)
RETURNS TABLE (order_id text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT o.id::text
    FROM public.orders o
   WHERE o.payment_status = 'paid'
     AND o.fulfillment_status = 'unfulfilled'
     AND o.created_at < now() - make_interval(mins => p_older_than_minutes)
     AND EXISTS (SELECT 1 FROM public.order_lines l WHERE l.order_id = o.id)
     AND NOT EXISTS (
       SELECT 1 FROM public.supplier_orders s
        WHERE s.order_id = o.id AND s.status NOT IN ('failed', 'cancelled')
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.job_outbox j
        WHERE j.type = 'order.route'
          AND j.status IN ('pending', 'running')
          AND j.payload ->> 'orderId' = o.id::text
     )
   ORDER BY o.created_at
   LIMIT GREATEST(p_limit, 1);
$$;

-- Placed POs with no tracking after the supplier's handling window + grace.
CREATE OR REPLACE FUNCTION public.find_overdue_supplier_orders(
  p_grace_days integer DEFAULT 2,
  p_limit integer DEFAULT 25
)
RETURNS TABLE (supplier_order_id uuid, order_id text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT so.id, so.order_id::text
    FROM public.supplier_orders so
    JOIN public.suppliers s ON s.id = so.supplier_id
   WHERE so.status IN ('placed', 'confirmed')
     AND so.tracking_number IS NULL
     AND so.placed_at IS NOT NULL
     AND so.placed_at < now() - make_interval(days => s.handling_days + p_grace_days)
   ORDER BY so.placed_at
   LIMIT GREATEST(p_limit, 1);
$$;

DO $$
DECLARE
  f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'finalize_dropship_order(text, jsonb)',
    'find_unfinalized_orders(integer)',
    'find_stuck_unrouted_orders(integer, integer)',
    'find_overdue_supplier_orders(integer, integer)'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', f);
  END LOOP;
END;
$$;
