-- Apply all migrations in supabase/migrations before running this seed.
-- Starts all existing products at 25 units; adjust inventory to real counts
-- before opening the store.
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

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'process_stripe_checkout_order'
  ) THEN
    RAISE EXCEPTION 'Stripe order RPC is missing; apply Supabase migrations first';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'webhook_events_stripe_event_id_key'
  ) THEN
    RAISE EXCEPTION 'Stripe webhook unique index is missing; apply Supabase migrations first';
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
