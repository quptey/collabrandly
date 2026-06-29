-- =====================================================================
-- Secure User Management System
-- Adds missing profile fields, creator_info, brand_info, shopper_info
-- Enhances applications, RLS, triggers, and seed data
-- =====================================================================

-- ============================================================
-- 1. PROFILES TABLE ENHANCEMENTS
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- ============================================================
-- 2. CREATOR INFORMATION TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.creator_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  instagram_url TEXT DEFAULT '',
  tiktok_url TEXT DEFAULT '',
  youtube_url TEXT DEFAULT '',
  other_social_links JSONB DEFAULT '[]',
  content_category TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  audience_size TEXT DEFAULT '',
  collaboration_preferences JSONB DEFAULT '{}',
  creator_status TEXT NOT NULL DEFAULT 'active'
    CHECK (creator_status IN ('active', 'inactive', 'suspended')),
  profile_completion_pct INTEGER NOT NULL DEFAULT 0
    CHECK (profile_completion_pct >= 0 AND profile_completion_pct <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. BRAND INFORMATION TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.brand_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  company_name TEXT DEFAULT '',
  company_logo TEXT DEFAULT '',
  business_email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  website TEXT DEFAULT '',
  industry TEXT DEFAULT '',
  company_description TEXT DEFAULT '',
  company_size TEXT DEFAULT '',
  company_country TEXT DEFAULT '',
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('active', 'pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. SHOPPER INFORMATION TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.shopper_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  favorite_creators UUID[] DEFAULT '{}',
  saved_products UUID[] DEFAULT '{}',
  wishlist UUID[] DEFAULT '{}',
  recently_viewed JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. APPLICATIONS TABLE ENHANCEMENTS
-- ============================================================
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT '';

-- ============================================================
-- 6. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_creator_info_user_id ON public.creator_info(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_info_user_id ON public.brand_info(user_id);
CREATE INDEX IF NOT EXISTS idx_shopper_info_user_id ON public.shopper_info(user_id);

-- ============================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.creator_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopper_info ENABLE ROW LEVEL SECURITY;

-- --- creator_info ---
DROP POLICY IF EXISTS "Users view own creator_info" ON public.creator_info;
CREATE POLICY "Users view own creator_info" ON public.creator_info
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own creator_info" ON public.creator_info;
CREATE POLICY "Users insert own creator_info" ON public.creator_info
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own creator_info" ON public.creator_info;
CREATE POLICY "Users update own creator_info" ON public.creator_info
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all creator_info" ON public.creator_info;
CREATE POLICY "Admins view all creator_info" ON public.creator_info
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update creator_info" ON public.creator_info;
CREATE POLICY "Admins update creator_info" ON public.creator_info
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role manages creator_info" ON public.creator_info;
CREATE POLICY "Service role manages creator_info" ON public.creator_info
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- --- brand_info ---
DROP POLICY IF EXISTS "Users view own brand_info" ON public.brand_info;
CREATE POLICY "Users view own brand_info" ON public.brand_info
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own brand_info" ON public.brand_info;
CREATE POLICY "Users insert own brand_info" ON public.brand_info
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own brand_info" ON public.brand_info;
CREATE POLICY "Users update own brand_info" ON public.brand_info
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all brand_info" ON public.brand_info;
CREATE POLICY "Admins view all brand_info" ON public.brand_info
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update brand_info" ON public.brand_info;
CREATE POLICY "Admins update brand_info" ON public.brand_info
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role manages brand_info" ON public.brand_info;
CREATE POLICY "Service role manages brand_info" ON public.brand_info
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- --- shopper_info ---
DROP POLICY IF EXISTS "Users view own shopper_info" ON public.shopper_info;
CREATE POLICY "Users view own shopper_info" ON public.shopper_info
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own shopper_info" ON public.shopper_info;
CREATE POLICY "Users insert own shopper_info" ON public.shopper_info
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own shopper_info" ON public.shopper_info;
CREATE POLICY "Users update own shopper_info" ON public.shopper_info
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all shopper_info" ON public.shopper_info;
CREATE POLICY "Admins view all shopper_info" ON public.shopper_info
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role manages shopper_info" ON public.shopper_info;
CREATE POLICY "Service role manages shopper_info" ON public.shopper_info
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 8. GRANTS
-- ============================================================
GRANT SELECT, INSERT, UPDATE ON public.creator_info TO authenticated;
GRANT ALL ON public.creator_info TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.brand_info TO authenticated;
GRANT ALL ON public.brand_info TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.shopper_info TO authenticated;
GRANT ALL ON public.shopper_info TO service_role;

-- ============================================================
-- 9. UPDATED TRIGGER: handle_new_user
-- Populates first_name, last_name, email, email_verified
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
  v_status text;
  v_display_name text;
  v_first_name text;
  v_last_name text;
BEGIN
  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'creator');
  v_display_name := COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1));

  IF v_role = 'shopper' THEN
    v_status := 'active';
  ELSIF v_role IN ('creator', 'brand') THEN
    v_status := 'pending';
  ELSE
    v_status := 'active';
  END IF;

  v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  v_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');

  INSERT INTO public.profiles (
    id, role, display_name, verification_status,
    first_name, last_name, email, email_verified
  )
  VALUES (
    NEW.id,
    v_role,
    v_display_name,
    v_status,
    v_first_name,
    v_last_name,
    NEW.email,
    NEW.email_confirmed_at IS NOT NULL
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 10. AUTO-CREATE ROLE-SPECIFIC INFO ON PROFILE INSERT
-- ============================================================

-- creator_info
CREATE OR REPLACE FUNCTION public.handle_new_creator_info()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'creator' THEN
    INSERT INTO public.creator_info (user_id, bio, instagram_url, tiktok_url, content_category, audience_size)
    VALUES (
      NEW.id,
      COALESCE(NEW.bio, ''),
      COALESCE(NEW.instagram_url, ''),
      COALESCE(NEW.tiktok_url, ''),
      COALESCE(NEW.category::text, ''),
      COALESCE(NEW.follower_range::text, '')
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_create_creator_info ON public.profiles;
CREATE TRIGGER on_profile_create_creator_info
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.role = 'creator')
  EXECUTE FUNCTION public.handle_new_creator_info();

-- brand_info
CREATE OR REPLACE FUNCTION public.handle_new_brand_info()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'brand' THEN
    INSERT INTO public.brand_info (user_id, company_name, company_logo, business_email, phone, website, industry, company_description, verification_status)
    VALUES (
      NEW.id,
      COALESCE(NEW.brand_name, ''),
      COALESCE(NEW.avatar_url, ''),
      COALESCE(NEW.email, ''),
      COALESCE(NEW.phone, ''),
      COALESCE(NEW.website, ''),
      COALESCE(NEW.industry, ''),
      COALESCE(NEW.bio, ''),
      COALESCE(NEW.verification_status, 'pending')
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_create_brand_info ON public.profiles;
CREATE TRIGGER on_profile_create_brand_info
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.role = 'brand')
  EXECUTE FUNCTION public.handle_new_brand_info();

-- shopper_info
CREATE OR REPLACE FUNCTION public.handle_new_shopper_info()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'shopper' THEN
    INSERT INTO public.shopper_info (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_create_shopper_info ON public.profiles;
CREATE TRIGGER on_profile_create_shopper_info
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.role = 'shopper')
  EXECUTE FUNCTION public.handle_new_shopper_info();

-- ============================================================
-- 11. LAST LOGIN RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles SET last_login = now() WHERE id = auth.uid();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_last_login() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_last_login() TO authenticated;

-- ============================================================
-- 12. REVOKE EXECUTE ON INTERNAL FUNCTIONS
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.handle_new_creator_info() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_brand_info() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_shopper_info() FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 13. EXPAND CITIES ENUM
-- ============================================================
ALTER TYPE public.kz_city ADD VALUE IF NOT EXISTS 'Aktobe';
ALTER TYPE public.kz_city ADD VALUE IF NOT EXISTS 'Atyrau';
ALTER TYPE public.kz_city ADD VALUE IF NOT EXISTS 'Karaganda';
ALTER TYPE public.kz_city ADD VALUE IF NOT EXISTS 'Kokshetau';
ALTER TYPE public.kz_city ADD VALUE IF NOT EXISTS 'Kostanay';
ALTER TYPE public.kz_city ADD VALUE IF NOT EXISTS 'Kyzylorda';
ALTER TYPE public.kz_city ADD VALUE IF NOT EXISTS 'Oral';
ALTER TYPE public.kz_city ADD VALUE IF NOT EXISTS 'Oskemen';
ALTER TYPE public.kz_city ADD VALUE IF NOT EXISTS 'Pavlodar';
ALTER TYPE public.kz_city ADD VALUE IF NOT EXISTS 'Petropavlovsk';
ALTER TYPE public.kz_city ADD VALUE IF NOT EXISTS 'Semey';
ALTER TYPE public.kz_city ADD VALUE IF NOT EXISTS 'Taldykorgan';
ALTER TYPE public.kz_city ADD VALUE IF NOT EXISTS 'Taraz';
ALTER TYPE public.kz_city ADD VALUE IF NOT EXISTS 'Turkistan';
ALTER TYPE public.kz_city ADD VALUE IF NOT EXISTS 'Ekibastuz';
ALTER TYPE public.kz_city ADD VALUE IF NOT EXISTS 'Rudny';
ALTER TYPE public.kz_city ADD VALUE IF NOT EXISTS 'Temirtau';
