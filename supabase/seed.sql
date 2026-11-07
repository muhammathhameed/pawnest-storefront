-- Apply all migrations in supabase/migrations before running this seed.
-- Starts all existing products at 25 units; adjust inventory to real counts
-- before opening the store.
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
