ALTER TABLE public.products
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
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'products_supplier_sku_key'
       AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_supplier_sku_key UNIQUE (supplier_id, sku);
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'products_status_check'
       AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_status_check
      CHECK (status IN ('draft', 'pending_review', 'active'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
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

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS products_pipeline_active_read
  ON public.products;
CREATE POLICY products_pipeline_active_read
  ON public.products FOR SELECT TO anon, authenticated
  USING (status = 'active');

DROP POLICY IF EXISTS products_pipeline_active_only
  ON public.products;
CREATE POLICY products_pipeline_active_only
  ON public.products AS RESTRICTIVE FOR SELECT TO anon, authenticated
  USING (status = 'active');
