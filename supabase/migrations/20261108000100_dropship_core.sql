-- Dropship core: suppliers, variants, supplier offers, markup rules, FX rates,
-- order lines, supplier purchase orders, tracking, audit trail and a job outbox.
--
-- Conventions
--   * All money is integer minor units (cents). Currencies are ISO-4217 codes.
--   * Every new table is server-only: RLS is enabled with no policies and
--     privileges are revoked from anon/authenticated. Only the service role
--     (webhooks, workers) touches them. Customer-facing reads are added later
--     through narrow views so supplier identity and costs never leak.
--   * products.id and orders.id are pre-existing columns whose type this repo
--     never declares, so foreign keys to them are created with the live type.

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_listed boolean NOT NULL DEFAULT true;

-- ---------------------------------------------------------------------------
-- Suppliers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code ~ '^[a-z0-9][a-z0-9_-]{1,40}$'),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'disabled')),
  integration_type text NOT NULL DEFAULT 'manual'
    CHECK (integration_type IN ('manual', 'http')),
  api_base_url text,
  -- Names of environment variables, never the secrets themselves.
  api_key_ref text,
  webhook_secret_ref text,
  ships_from_country text CHECK (ships_from_country IS NULL OR ships_from_country ~ '^[A-Z]{2}$'),
  cost_currency text NOT NULL DEFAULT 'USD' CHECK (cost_currency ~ '^[A-Z]{3}$'),
  handling_days integer NOT NULL DEFAULT 2 CHECK (handling_days >= 0),
  transit_days_min integer NOT NULL DEFAULT 7 CHECK (transit_days_min >= 0),
  transit_days_max integer NOT NULL DEFAULT 20 CHECK (transit_days_max >= transit_days_min),
  supports_blind_shipping boolean NOT NULL DEFAULT true,
  return_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Product variants (created with the live products.id type)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_product_id_type text;
BEGIN
  IF to_regclass('public.product_variants') IS NULL THEN
    SELECT format_type(a.atttypid, a.atttypmod)
      INTO v_product_id_type
      FROM pg_attribute a
     WHERE a.attrelid = 'public.products'::regclass
       AND a.attname = 'id'
       AND NOT a.attisdropped;

    EXECUTE format($ddl$
      CREATE TABLE public.product_variants (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id %s NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
        sku text NOT NULL UNIQUE,
        title text NOT NULL DEFAULT 'Default',
        options jsonb NOT NULL DEFAULT '{}'::jsonb,
        price_cents integer CHECK (price_cents IS NULL OR price_cents >= 0),
        compare_at_cents integer CHECK (compare_at_cents IS NULL OR compare_at_cents >= 0),
        available_stock integer NOT NULL DEFAULT 0 CHECK (available_stock >= 0),
        safety_stock integer NOT NULL DEFAULT 2 CHECK (safety_stock >= 0),
        listed boolean NOT NULL DEFAULT false,
        manual_unlisted boolean NOT NULL DEFAULT false,
        unlisted_reason text,
        weight_grams integer CHECK (weight_grams IS NULL OR weight_grams >= 0),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    $ddl$, v_product_id_type);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS product_variants_product_id_idx
  ON public.product_variants (product_id);

-- ---------------------------------------------------------------------------
-- Supplier offers: one row per (supplier, variant) with cost, stock, priority
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supplier_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  supplier_sku text NOT NULL,
  cost_cents integer NOT NULL CHECK (cost_cents >= 0),
  cost_currency text NOT NULL DEFAULT 'USD' CHECK (cost_currency ~ '^[A-Z]{3}$'),
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  lead_time_days integer CHECK (lead_time_days IS NULL OR lead_time_days >= 0),
  -- Lower number = preferred supplier.
  priority smallint NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (supplier_id, supplier_sku),
  UNIQUE (supplier_id, variant_id)
);

CREATE INDEX IF NOT EXISTS supplier_offers_variant_id_idx
  ON public.supplier_offers (variant_id);

-- ---------------------------------------------------------------------------
-- Pricing: cost-bracket markup rules and FX rates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.markup_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  currency text NOT NULL DEFAULT 'USD' CHECK (currency ~ '^[A-Z]{3}$'),
  -- Bracket is [min_cost_cents, max_cost_cents); NULL max means no upper bound.
  min_cost_cents integer NOT NULL DEFAULT 0 CHECK (min_cost_cents >= 0),
  max_cost_cents integer,
  multiplier numeric(8, 4) NOT NULL DEFAULT 1 CHECK (multiplier > 0),
  flat_cents integer NOT NULL DEFAULT 0,
  -- Optional price ending in cents (e.g. 99 for x.99). NULL = no rounding.
  round_to_cents smallint CHECK (round_to_cents IS NULL OR round_to_cents BETWEEN 0 AND 99),
  priority integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (max_cost_cents IS NULL OR max_cost_cents > min_cost_cents)
);

CREATE TABLE IF NOT EXISTS public.fx_rates (
  base_currency text NOT NULL CHECK (base_currency ~ '^[A-Z]{3}$'),
  quote_currency text NOT NULL CHECK (quote_currency ~ '^[A-Z]{3}$'),
  rate numeric(18, 8) NOT NULL CHECK (rate > 0),
  fetched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (base_currency, quote_currency)
);

-- Starting brackets. The first two follow the agreed rules; the third is a
-- placeholder: review it before launch.
INSERT INTO public.markup_rules
  (name, min_cost_cents, max_cost_cents, multiplier, flat_cents)
SELECT v.name, v.min_cost_cents, v.max_cost_cents, v.multiplier, v.flat_cents
  FROM (VALUES
    ('Cost under $10: 3x', 0, 1000, 3.0, 0),
    ('Cost $10 to under $50: 2x + $5', 1000, 5000, 2.0, 500),
    ('Cost $50 and up: 1.6x (placeholder)', 5000, NULL::integer, 1.6, 0)
  ) AS v(name, min_cost_cents, max_cost_cents, multiplier, flat_cents)
 WHERE NOT EXISTS (SELECT 1 FROM public.markup_rules);

-- ---------------------------------------------------------------------------
-- Orders: fulfillment state and ship-to details
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fulfillment_status text NOT NULL DEFAULT 'unfulfilled',
  ADD COLUMN IF NOT EXISTS blind_shipping boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS shipping_name text,
  ADD COLUMN IF NOT EXISTS shipping_phone text,
  ADD COLUMN IF NOT EXISTS shipping_address jsonb,
  ADD COLUMN IF NOT EXISTS exception_reason text,
  ADD COLUMN IF NOT EXISTS fulfillment_updated_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'orders_fulfillment_status_check'
       AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_fulfillment_status_check
      CHECK (fulfillment_status IN (
        'unfulfilled', 'po_placed', 'partially_shipped', 'shipped',
        'delivered', 'exception', 'cancelled'
      ));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS orders_fulfillment_status_idx
  ON public.orders (fulfillment_status);

-- ---------------------------------------------------------------------------
-- Order lines, supplier purchase orders, audit trail (live orders.id type)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_order_id_type text;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod)
    INTO v_order_id_type
    FROM pg_attribute a
   WHERE a.attrelid = 'public.orders'::regclass
     AND a.attname = 'id'
     AND NOT a.attisdropped;

  IF to_regclass('public.order_lines') IS NULL THEN
    EXECUTE format($ddl$
      CREATE TABLE public.order_lines (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id %s NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
        product_id text NOT NULL,
        variant_id uuid NOT NULL REFERENCES public.product_variants(id),
        sku text NOT NULL,
        title text,
        quantity integer NOT NULL CHECK (quantity > 0),
        unit_price_cents integer NOT NULL CHECK (unit_price_cents >= 0),
        currency text NOT NULL DEFAULT 'USD' CHECK (currency ~ '^[A-Z]{3}$'),
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (order_id, variant_id)
      )
    $ddl$, v_order_id_type);
  END IF;

  IF to_regclass('public.supplier_orders') IS NULL THEN
    EXECUTE format($ddl$
      CREATE TABLE public.supplier_orders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id %s NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
        supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
        status text NOT NULL DEFAULT 'pending' CHECK (status IN (
          'pending', 'placed', 'confirmed', 'shipped', 'delivered',
          'exception', 'failed', 'cancelled'
        )),
        attempt integer NOT NULL DEFAULT 1 CHECK (attempt >= 1),
        idempotency_key text NOT NULL UNIQUE,
        external_po_id text,
        currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
        total_cost_cents integer NOT NULL DEFAULT 0 CHECK (total_cost_cents >= 0),
        blind boolean NOT NULL DEFAULT true,
        tracking_number text,
        carrier text,
        tracking_registered_at timestamptz,
        placed_at timestamptz,
        shipped_at timestamptz,
        delivered_at timestamptz,
        failure_reason text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    $ddl$, v_order_id_type);
  END IF;

  IF to_regclass('public.order_events') IS NULL THEN
    EXECUTE format($ddl$
      CREATE TABLE public.order_events (
        id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        order_id %s NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
        supplier_order_id uuid REFERENCES public.supplier_orders(id) ON DELETE SET NULL,
        type text NOT NULL,
        from_status text,
        to_status text,
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    $ddl$, v_order_id_type);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS order_lines_order_id_idx ON public.order_lines (order_id);
CREATE INDEX IF NOT EXISTS supplier_orders_order_id_idx ON public.supplier_orders (order_id);
CREATE INDEX IF NOT EXISTS supplier_orders_status_idx ON public.supplier_orders (status);
CREATE INDEX IF NOT EXISTS supplier_orders_tracking_number_idx
  ON public.supplier_orders (tracking_number) WHERE tracking_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS order_events_order_id_idx
  ON public.order_events (order_id, created_at);

CREATE TABLE IF NOT EXISTS public.supplier_order_items (
  supplier_order_id uuid NOT NULL REFERENCES public.supplier_orders(id) ON DELETE CASCADE,
  order_line_id uuid NOT NULL REFERENCES public.order_lines(id) ON DELETE CASCADE,
  offer_id uuid REFERENCES public.supplier_offers(id) ON DELETE SET NULL,
  supplier_sku text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_cost_cents integer NOT NULL CHECK (unit_cost_cents >= 0),
  PRIMARY KEY (supplier_order_id, order_line_id)
);

CREATE TABLE IF NOT EXISTS public.tracking_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  supplier_order_id uuid NOT NULL REFERENCES public.supplier_orders(id) ON DELETE CASCADE,
  tracking_number text NOT NULL,
  carrier text,
  status text NOT NULL,
  sub_status text,
  description text,
  location text,
  occurred_at timestamptz NOT NULL,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS tracking_events_dedupe_key
  ON public.tracking_events (
    supplier_order_id, tracking_number, occurred_at, status,
    md5(COALESCE(description, ''))
  );

-- ---------------------------------------------------------------------------
-- Job outbox (a dependency-free queue; swap for Inngest/BullMQ later)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.job_outbox (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'done', 'dead')),
  run_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 8,
  last_error text,
  locked_at timestamptz,
  dedupe_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS job_outbox_due_idx
  ON public.job_outbox (run_at) WHERE status = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS job_outbox_active_dedupe_key
  ON public.job_outbox (dedupe_key)
  WHERE dedupe_key IS NOT NULL AND status IN ('pending', 'running');

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'suppliers', 'product_variants', 'supplier_offers', 'markup_rules',
    'supplier_orders'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
       WHERE tgname = t || '_set_updated_at'
         AND tgrelid = ('public.' || t)::regclass
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE UPDATE ON public.%I
           FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
        t || '_set_updated_at', t
      );
    END IF;
  END LOOP;
END;
$$;

-- Every product always has at least one variant so orders can map to a SKU.
CREATE OR REPLACE FUNCTION public.create_default_product_variant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.product_variants (
    product_id, sku, title, price_cents, available_stock, safety_stock, listed
  )
  VALUES (
    NEW.id,
    'PN-' || NEW.id::text,
    'Default',
    round(NEW.price * 100)::integer,
    COALESCE(NEW.stock_quantity, 0),
    0,
    true
  )
  ON CONFLICT (sku) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_create_default_variant ON public.products;
CREATE TRIGGER products_create_default_variant
  AFTER INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.create_default_product_variant();

-- Backfill: existing products keep selling exactly as before (no supplier
-- offers means stock stays self-managed until offers are attached).
INSERT INTO public.product_variants (
  product_id, sku, title, price_cents, available_stock, safety_stock, listed
)
SELECT p.id, 'PN-' || p.id::text, 'Default', round(p.price * 100)::integer,
       COALESCE(p.stock_quantity, 0), 0, true
  FROM public.products p
ON CONFLICT (sku) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Availability: auto-list / auto-unlist against the safety threshold
-- ---------------------------------------------------------------------------
-- A variant with supplier offers is listed only while the stock from active
-- offers of active suppliers is at least max(safety_stock, 1). A variant with
-- no offers at all is self-managed and left untouched.
CREATE OR REPLACE FUNCTION public.refresh_variant_availability(p_variant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v public.product_variants%ROWTYPE;
  v_offer_count integer;
  v_available integer;
  v_listed boolean;
  v_reason text;
  v_changed boolean;
BEGIN
  SELECT * INTO v
    FROM public.product_variants
   WHERE id = p_variant_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT count(*),
         COALESCE(sum(o.stock_quantity)
                  FILTER (WHERE o.is_active AND s.status = 'active'), 0)
    INTO v_offer_count, v_available
    FROM public.supplier_offers o
    JOIN public.suppliers s ON s.id = o.supplier_id
   WHERE o.variant_id = p_variant_id;

  IF v_offer_count = 0 THEN
    RETURN jsonb_build_object(
      'found', true, 'managed', false, 'changed', false,
      'listed', v.listed, 'product_id', v.product_id::text
    );
  END IF;

  IF v.manual_unlisted THEN
    v_listed := false;
    v_reason := 'manual';
  ELSIF v_available < GREATEST(v.safety_stock, 1) THEN
    v_listed := false;
    v_reason := 'low_stock';
  ELSE
    v_listed := true;
    v_reason := NULL;
  END IF;

  v_changed := v_listed IS DISTINCT FROM v.listed;

  UPDATE public.product_variants
     SET available_stock = v_available,
         listed = v_listed,
         unlisted_reason = v_reason
   WHERE id = p_variant_id;

  UPDATE public.products p
     SET is_listed = EXISTS (
           SELECT 1 FROM public.product_variants x
            WHERE x.product_id = p.id AND x.listed
         ),
         stock_quantity = COALESCE((
           SELECT sum(GREATEST(x.available_stock - x.safety_stock, 0))::integer
             FROM public.product_variants x
            WHERE x.product_id = p.id AND x.listed
         ), 0)
   WHERE p.id = v.product_id;

  RETURN jsonb_build_object(
    'found', true, 'managed', true, 'changed', v_changed,
    'listed', v_listed, 'available', v_available,
    'product_id', v.product_id::text
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Supplier feed ingestion (webhook push or scheduled pull)
-- ---------------------------------------------------------------------------
-- p_items: [{ "sku": text, "stock": int, "cost_cents": int?, "currency": text? }]
-- Items older than an offer's last sync are ignored so out-of-order deliveries
-- cannot overwrite fresher data.
CREATE OR REPLACE FUNCTION public.apply_supplier_feed(
  p_supplier_id uuid,
  p_items jsonb,
  p_event_ts timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item jsonb;
  v_offer public.supplier_offers%ROWTYPE;
  v_sku text;
  v_stock integer;
  v_cost integer;
  v_currency text;
  v_result jsonb;
  v_processed integer := 0;
  v_stale integer := 0;
  v_invalid integer := 0;
  v_unmapped text[] := ARRAY[]::text[];
  v_changed_products text[] := ARRAY[]::text[];
  v_reprice_variants uuid[] := ARRAY[]::uuid[];
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Supplier feed items must be a JSON array';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_sku := NULLIF(v_item ->> 'sku', '');
    IF v_sku IS NULL
       OR (v_item ->> 'stock') IS NULL
       OR (v_item ->> 'stock') !~ '^[0-9]+$'
       OR ((v_item ->> 'cost_cents') IS NOT NULL
           AND (v_item ->> 'cost_cents') !~ '^[0-9]+$') THEN
      v_invalid := v_invalid + 1;
      CONTINUE;
    END IF;

    v_stock := (v_item ->> 'stock')::integer;
    v_cost := (v_item ->> 'cost_cents')::integer;
    v_currency := upper(NULLIF(v_item ->> 'currency', ''));

    IF v_currency IS NOT NULL AND v_currency !~ '^[A-Z]{3}$' THEN
      v_invalid := v_invalid + 1;
      CONTINUE;
    END IF;

    SELECT * INTO v_offer
      FROM public.supplier_offers
     WHERE supplier_id = p_supplier_id AND supplier_sku = v_sku
     FOR UPDATE;

    IF NOT FOUND THEN
      v_unmapped := array_append(v_unmapped, v_sku);
      CONTINUE;
    END IF;

    IF p_event_ts IS NOT NULL
       AND v_offer.last_synced_at IS NOT NULL
       AND p_event_ts < v_offer.last_synced_at THEN
      v_stale := v_stale + 1;
      CONTINUE;
    END IF;

    UPDATE public.supplier_offers
       SET stock_quantity = v_stock,
           cost_cents = COALESCE(v_cost, cost_cents),
           cost_currency = COALESCE(v_currency, cost_currency),
           last_synced_at = COALESCE(p_event_ts, now())
     WHERE id = v_offer.id;

    v_processed := v_processed + 1;

    IF (v_cost IS NOT NULL AND v_cost <> v_offer.cost_cents)
       OR (v_currency IS NOT NULL AND v_currency <> v_offer.cost_currency) THEN
      IF NOT v_offer.variant_id = ANY (v_reprice_variants) THEN
        v_reprice_variants := array_append(v_reprice_variants, v_offer.variant_id);
      END IF;
    END IF;

    v_result := public.refresh_variant_availability(v_offer.variant_id);
    IF COALESCE((v_result ->> 'changed')::boolean, false) THEN
      IF NOT (v_result ->> 'product_id') = ANY (v_changed_products) THEN
        v_changed_products := array_append(v_changed_products, v_result ->> 'product_id');
      END IF;
      IF NOT v_offer.variant_id = ANY (v_reprice_variants) THEN
        v_reprice_variants := array_append(v_reprice_variants, v_offer.variant_id);
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'processed', v_processed,
    'stale', v_stale,
    'invalid', v_invalid,
    'unmapped', to_jsonb(v_unmapped),
    'listing_changed_product_ids', to_jsonb(v_changed_products),
    'reprice_variant_ids', to_jsonb(v_reprice_variants)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Split-order PO creation with atomic stock reservation
-- ---------------------------------------------------------------------------
-- p_items: [{ "order_line_id": uuid, "offer_id": uuid, "quantity": int }]
-- Creates one PO for one supplier. Reserves offer stock in the same
-- transaction; any failure raises and rolls the whole PO back so the caller
-- can reroute. Replaying the same idempotency key is a no-op.
CREATE OR REPLACE FUNCTION public.create_supplier_order(
  p_order_id text,
  p_supplier_id uuid,
  p_currency text,
  p_attempt integer,
  p_idempotency_key text,
  p_blind boolean,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order_id public.orders.id%TYPE;
  v_po_id uuid;
  v_item jsonb;
  v_offer public.supplier_offers%ROWTYPE;
  v_line public.order_lines%ROWTYPE;
  v_qty integer;
  v_total bigint := 0;
BEGIN
  v_order_id := p_order_id;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'invalid_items';
  END IF;

  INSERT INTO public.supplier_orders (
    order_id, supplier_id, currency, attempt, idempotency_key, blind
  )
  VALUES (
    v_order_id, p_supplier_id, p_currency, p_attempt, p_idempotency_key,
    COALESCE(p_blind, true)
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_po_id;

  IF v_po_id IS NULL THEN
    SELECT id INTO v_po_id
      FROM public.supplier_orders
     WHERE idempotency_key = p_idempotency_key;
    RETURN jsonb_build_object('supplier_order_id', v_po_id, 'created', false);
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := (v_item ->> 'quantity')::integer;

    SELECT * INTO v_line
      FROM public.order_lines
     WHERE id = (v_item ->> 'order_line_id')::uuid
       AND order_id = v_order_id
     FOR UPDATE;

    IF NOT FOUND OR v_qty IS NULL OR v_qty <> v_line.quantity THEN
      RAISE EXCEPTION 'invalid_line:%', v_item ->> 'order_line_id';
    END IF;

    IF EXISTS (
      SELECT 1
        FROM public.supplier_order_items i
        JOIN public.supplier_orders o ON o.id = i.supplier_order_id
       WHERE i.order_line_id = v_line.id
         AND o.status NOT IN ('failed', 'cancelled')
    ) THEN
      RAISE EXCEPTION 'line_already_routed:%', v_line.id;
    END IF;

    SELECT * INTO v_offer
      FROM public.supplier_offers
     WHERE id = (v_item ->> 'offer_id')::uuid
       AND supplier_id = p_supplier_id
       AND variant_id = v_line.variant_id
     FOR UPDATE;

    IF NOT FOUND OR NOT v_offer.is_active OR v_offer.stock_quantity < v_qty THEN
      RAISE EXCEPTION 'offer_unavailable:%', v_item ->> 'offer_id';
    END IF;

    UPDATE public.supplier_offers
       SET stock_quantity = stock_quantity - v_qty
     WHERE id = v_offer.id;

    INSERT INTO public.supplier_order_items (
      supplier_order_id, order_line_id, offer_id, supplier_sku, quantity,
      unit_cost_cents
    )
    VALUES (
      v_po_id, v_line.id, v_offer.id, v_offer.supplier_sku, v_qty,
      v_offer.cost_cents
    );

    v_total := v_total + v_offer.cost_cents::bigint * v_qty;
    PERFORM public.refresh_variant_availability(v_offer.variant_id);
  END LOOP;

  UPDATE public.supplier_orders
     SET total_cost_cents = v_total::integer
   WHERE id = v_po_id;

  RETURN jsonb_build_object('supplier_order_id', v_po_id, 'created', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- Order status state machine (defense in depth; the app enforces it too)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transition_order_status(
  p_order_id text,
  p_to_status text,
  p_reason text DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_supplier_order_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order_id public.orders.id%TYPE;
  v_from text;
  v_allowed boolean;
BEGIN
  v_order_id := p_order_id;

  SELECT fulfillment_status INTO v_from
    FROM public.orders
   WHERE id = v_order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  IF v_from = p_to_status THEN
    RETURN jsonb_build_object('changed', false, 'from', v_from, 'to', p_to_status);
  END IF;

  v_allowed := CASE v_from
    WHEN 'unfulfilled' THEN p_to_status IN ('po_placed', 'exception', 'cancelled')
    WHEN 'po_placed' THEN p_to_status IN ('partially_shipped', 'shipped', 'exception', 'cancelled')
    WHEN 'partially_shipped' THEN p_to_status IN ('shipped', 'exception')
    WHEN 'shipped' THEN p_to_status IN ('delivered', 'exception')
    WHEN 'delivered' THEN p_to_status IN ('exception')
    WHEN 'exception' THEN p_to_status IN (
      'unfulfilled', 'po_placed', 'partially_shipped', 'shipped',
      'delivered', 'cancelled'
    )
    ELSE false
  END;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'illegal_transition:% -> %', v_from, p_to_status;
  END IF;

  UPDATE public.orders
     SET fulfillment_status = p_to_status,
         exception_reason = CASE
           WHEN p_to_status = 'exception' THEN p_reason
           ELSE NULL
         END,
         fulfillment_updated_at = now()
   WHERE id = v_order_id;

  INSERT INTO public.order_events (
    order_id, supplier_order_id, type, from_status, to_status, payload
  )
  VALUES (
    v_order_id, p_supplier_order_id, 'order.status_changed', v_from,
    p_to_status,
    COALESCE(p_payload, '{}'::jsonb)
      || CASE WHEN p_reason IS NULL THEN '{}'::jsonb
              ELSE jsonb_build_object('reason', p_reason) END
  );

  RETURN jsonb_build_object('changed', true, 'from', v_from, 'to', p_to_status);
END;
$$;

-- ---------------------------------------------------------------------------
-- Job outbox operations
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enqueue_job(
  p_type text,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_run_at timestamptz DEFAULT now(),
  p_dedupe_key text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id bigint;
BEGIN
  INSERT INTO public.job_outbox (type, payload, run_at, dedupe_key)
  VALUES (p_type, COALESCE(p_payload, '{}'::jsonb), COALESCE(p_run_at, now()), p_dedupe_key)
  ON CONFLICT (dedupe_key)
    WHERE dedupe_key IS NOT NULL AND status IN ('pending', 'running')
  DO NOTHING
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Claims due jobs. Jobs stuck in 'running' for over 10 minutes (crashed
-- worker) are made claimable again.
CREATE OR REPLACE FUNCTION public.claim_jobs(p_limit integer DEFAULT 10)
RETURNS SETOF public.job_outbox
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.job_outbox j
     SET status = 'running',
         attempts = j.attempts + 1,
         locked_at = now()
   WHERE j.id IN (
     SELECT id FROM public.job_outbox
      WHERE (status = 'pending' AND run_at <= now())
         OR (status = 'running' AND locked_at < now() - interval '10 minutes')
      ORDER BY run_at, id
      LIMIT GREATEST(p_limit, 1)
      FOR UPDATE SKIP LOCKED
   )
  RETURNING j.*;
$$;

CREATE OR REPLACE FUNCTION public.complete_job(p_id bigint)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.job_outbox
     SET status = 'done', completed_at = now(), locked_at = NULL
   WHERE id = p_id;
$$;

CREATE OR REPLACE FUNCTION public.fail_job(
  p_id bigint,
  p_error text,
  p_retry_in_seconds integer DEFAULT 60
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.job_outbox
     SET status = CASE WHEN attempts >= max_attempts THEN 'dead' ELSE 'pending' END,
         run_at = now() + make_interval(secs => GREATEST(p_retry_in_seconds, 1)),
         last_error = left(p_error, 2000),
         locked_at = NULL
   WHERE id = p_id;
$$;

-- ---------------------------------------------------------------------------
-- Access control: server-only
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'suppliers', 'product_variants', 'supplier_offers', 'markup_rules',
    'fx_rates', 'order_lines', 'supplier_orders', 'supplier_order_items',
    'order_events', 'tracking_events', 'job_outbox'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', t
    );
  END LOOP;
END;
$$;

-- The storefront reads variants with the public key to price and list them.
-- Expose only the customer-safe columns, and only for listed variants.
GRANT SELECT (id, product_id, sku, title, options, price_cents,
              compare_at_cents, listed)
  ON public.product_variants TO anon, authenticated;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'product_variants'
       AND policyname = 'product_variants_public_read'
  ) THEN
    CREATE POLICY product_variants_public_read
      ON public.product_variants FOR SELECT TO anon, authenticated
      USING (listed);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_variant_availability(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_supplier_feed(uuid, jsonb, timestamptz)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_supplier_order(
  text, uuid, text, integer, text, boolean, jsonb
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.transition_order_status(
  text, text, text, jsonb, uuid
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_job(text, jsonb, timestamptz, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_jobs(integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_job(bigint)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_job(bigint, text, integer)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.refresh_variant_availability(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_supplier_feed(uuid, jsonb, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_supplier_order(
  text, uuid, text, integer, text, boolean, jsonb
) TO service_role;
GRANT EXECUTE ON FUNCTION public.transition_order_status(
  text, text, text, jsonb, uuid
) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_job(text, jsonb, timestamptz, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_jobs(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_job(bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_job(bigint, text, integer) TO service_role;
