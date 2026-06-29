-- Missing columns for MVP completeness
-- Run this AFTER full-schema.sql

-- Brand company profile fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS website text DEFAULT '',
  ADD COLUMN IF NOT EXISTS industry text DEFAULT '',
  ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false;

-- Campaign goal on brand requests
ALTER TABLE public.brand_requests
  ADD COLUMN IF NOT EXISTS goal text DEFAULT '';

-- Product description
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS description text DEFAULT '';

-- Admin policy to view/manage all content
DROP POLICY IF EXISTS "Admins can view all brand_requests" ON public.brand_requests;
CREATE POLICY "Admins can view all brand_requests" ON public.brand_requests
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all collections" ON public.collections;
CREATE POLICY "Admins can view all collections" ON public.collections
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all products" ON public.products;
CREATE POLICY "Admins can view all products" ON public.products
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete collections" ON public.collections;
CREATE POLICY "Admins can delete collections" ON public.collections
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
CREATE POLICY "Admins can delete products" ON public.products
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete brand_requests" ON public.brand_requests;
CREATE POLICY "Admins can delete brand_requests" ON public.brand_requests
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
