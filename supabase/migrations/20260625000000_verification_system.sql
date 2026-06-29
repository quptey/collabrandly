-- =====================================================================
-- Verification & Approval System
-- Adds shopper role, verification_status, phone, and rejection_reason
-- =====================================================================

-- 1. Add 'shopper' to user_role enum
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'shopper';

-- 2. Add verification columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'active'
    CHECK (verification_status IN ('active', 'pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS rejection_reason text DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone text DEFAULT '',
  ADD COLUMN IF NOT EXISTS social_platform text DEFAULT '';

-- 3. Minimal handle_new_user — only inserts core columns.
--    phone / social fields are set later by submitCreatorApplication etc.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
  v_status text;
BEGIN
  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'creator');

  IF v_role = 'shopper' THEN
    v_status := 'active';
  ELSIF v_role IN ('creator', 'brand') THEN
    v_status := 'pending';
  ELSE
    v_status := 'active';
  END IF;

  INSERT INTO public.profiles (id, role, display_name, verification_status)
  VALUES (
    NEW.id,
    v_role,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    v_status
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 4. Create a helper function to check if a user can perform premium actions
CREATE OR REPLACE FUNCTION public.is_verified(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT verification_status IN ('active', 'approved')
  FROM public.profiles
  WHERE id = user_id
$$;
