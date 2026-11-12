-- Customer account: profile extras, addresses, wishlist, avatar storage.
BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT
    '{"order_updates":true,"promotions":false,"price_drops":false}'::jsonb;
GRANT UPDATE (phone, notification_prefs) ON public.profiles TO authenticated;

CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Home',
  full_name text NOT NULL,
  line1 text NOT NULL,
  line2 text,
  city text NOT NULL,
  region text NOT NULL,
  postal_code text NOT NULL,
  country text NOT NULL DEFAULT 'US',
  phone text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_addresses_user_idx ON public.customer_addresses (user_id);
-- At most one default address per user.
CREATE UNIQUE INDEX IF NOT EXISTS customer_addresses_one_default
  ON public.customer_addresses (user_id) WHERE is_default;

ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS customer_addresses_own ON public.customer_addresses;
CREATE POLICY customer_addresses_own ON public.customer_addresses
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
REVOKE ALL ON public.customer_addresses FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_addresses TO authenticated;
GRANT ALL ON public.customer_addresses TO service_role;

CREATE TABLE IF NOT EXISTS public.wishlist_items (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wishlist_own ON public.wishlist_items;
CREATE POLICY wishlist_own ON public.wishlist_items
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
REVOKE ALL ON public.wishlist_items FROM anon;
GRANT SELECT, INSERT, DELETE ON public.wishlist_items TO authenticated;
GRANT ALL ON public.wishlist_items TO service_role;

COMMIT;

-- Avatar bucket (public read; users write only inside their own <uid>/ folder).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS avatars_write_own ON storage.objects;
CREATE POLICY avatars_write_own ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

NOTIFY pgrst, 'reload schema';
