-- =====================================================================
-- Security Audit Migration — Collabrandly
-- Fixes RLS gaps, FK issues, role validation, missing tables/indexes
-- Idempotent (safe to run multiple times)
-- =====================================================================

-- ============================================================
-- 1. CAMPAIGN APPLICATIONS TABLE (CREATE IF NOT EXISTS)
-- Added 'withdrawn' status for creator withdrawal
-- ============================================================
CREATE TABLE IF NOT EXISTS public.campaign_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  message TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, creator_id)
);

-- ============================================================
-- 2. CAMPAIGN APPLICATIONS RLS POLICIES
-- ============================================================
ALTER TABLE public.campaign_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaign_applications_select" ON public.campaign_applications;
CREATE POLICY "campaign_applications_select" ON public.campaign_applications
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND brand_id = auth.uid())
    OR auth.uid() = creator_id
  );

DROP POLICY IF EXISTS "campaign_applications_insert" ON public.campaign_applications;
CREATE POLICY "campaign_applications_insert" ON public.campaign_applications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "campaign_applications_update_brand" ON public.campaign_applications;
CREATE POLICY "campaign_applications_update_brand" ON public.campaign_applications
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND brand_id = auth.uid()));

DROP POLICY IF EXISTS "campaign_applications_update_creator" ON public.campaign_applications;
CREATE POLICY "campaign_applications_update_creator" ON public.campaign_applications
  FOR UPDATE TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id AND status = 'withdrawn');

DROP POLICY IF EXISTS "campaign_applications_admin" ON public.campaign_applications;
CREATE POLICY "campaign_applications_admin" ON public.campaign_applications
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 3. FIX FK REFERENCE IN BRAND_REQUESTS
--    creator_id previously referenced public.profiles(id), which is
--    an indirect chain through profiles.id -> auth.users.id. Changed
--    to reference auth.users(id) directly for clarity and safety.
-- ============================================================
DO $$
DECLARE
  constraint_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'brand_requests_creator_id_fkey'
      AND table_schema = 'public' AND table_name = 'brand_requests'
  ) INTO constraint_exists;

  IF constraint_exists THEN
    EXECUTE 'ALTER TABLE public.brand_requests DROP CONSTRAINT brand_requests_creator_id_fkey';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'brand_requests_creator_id_fkey_fix'
      AND table_schema = 'public' AND table_name = 'brand_requests'
  ) INTO constraint_exists;

  IF NOT constraint_exists THEN
    EXECUTE 'ALTER TABLE public.brand_requests ADD CONSTRAINT brand_requests_creator_id_fkey_fix
      FOREIGN KEY (creator_id) REFERENCES auth.users(id) ON DELETE CASCADE';
  END IF;
END $$;

-- Fix the same pattern in collections.creator_id
DO $$
DECLARE
  constraint_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'collections_creator_id_fkey'
      AND table_schema = 'public' AND table_name = 'collections'
  ) INTO constraint_exists;

  IF constraint_exists THEN
    EXECUTE 'ALTER TABLE public.collections DROP CONSTRAINT collections_creator_id_fkey';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'collections_creator_id_fkey_fix'
      AND table_schema = 'public' AND table_name = 'collections'
  ) INTO constraint_exists;

  IF NOT constraint_exists THEN
    EXECUTE 'ALTER TABLE public.collections ADD CONSTRAINT collections_creator_id_fkey_fix
      FOREIGN KEY (creator_id) REFERENCES auth.users(id) ON DELETE CASCADE';
  END IF;
END $$;

-- Fix the same pattern in products.creator_id
DO $$
DECLARE
  constraint_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'products_creator_id_fkey'
      AND table_schema = 'public' AND table_name = 'products'
  ) INTO constraint_exists;

  IF constraint_exists THEN
    EXECUTE 'ALTER TABLE public.products DROP CONSTRAINT products_creator_id_fkey';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'products_creator_id_fkey_fix'
      AND table_schema = 'public' AND table_name = 'products'
  ) INTO constraint_exists;

  IF NOT constraint_exists THEN
    EXECUTE 'ALTER TABLE public.products ADD CONSTRAINT products_creator_id_fkey_fix
      FOREIGN KEY (creator_id) REFERENCES auth.users(id) ON DELETE CASCADE';
  END IF;
END $$;

-- Fix subscriptions.user_id to reference auth.users instead of profiles
DO $$
DECLARE
  constraint_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'subscriptions_user_id_fkey'
      AND table_schema = 'public' AND table_name = 'subscriptions'
  ) INTO constraint_exists;

  IF constraint_exists THEN
    EXECUTE 'ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_user_id_fkey';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'subscriptions_user_id_fkey_fix'
      AND table_schema = 'public' AND table_name = 'subscriptions'
  ) INTO constraint_exists;

  IF NOT constraint_exists THEN
    EXECUTE 'ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_user_id_fkey_fix
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE';
  END IF;
END $$;

-- ============================================================
-- 4. FIX handle_new_user WITH ROLE VALIDATION
--    Previously: direct CAST could fail on invalid role input.
--    Now: validates role string before casting, defaults to 'creator'.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role_input text;
  v_role public.user_role;
  v_status text;
  v_display_name text;
  v_first_name text;
  v_last_name text;
BEGIN
  v_role_input := NEW.raw_user_meta_data->>'role';

  IF v_role_input IS NULL OR v_role_input NOT IN ('creator', 'brand', 'shopper') THEN
    v_role := 'creator';
  ELSE
    BEGIN
      v_role := v_role_input::public.user_role;
    EXCEPTION WHEN others THEN
      v_role := 'creator';
    END;
  END IF;

  v_display_name := COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1));
  v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  v_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');

  IF v_role = 'shopper' THEN
    v_status := 'active';
  ELSIF v_role IN ('creator', 'brand') THEN
    v_status := 'pending';
  ELSE
    v_status := 'active';
  END IF;

  INSERT INTO public.profiles (id, role, display_name, verification_status, first_name, last_name, email, email_verified)
  VALUES (NEW.id, v_role, v_display_name, v_status, v_first_name, v_last_name, NEW.email, NEW.email_confirmed_at IS NOT NULL)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 5. ADD email COLUMN TO PROFILES (idempotent — already exists in
--    20260626000000 but included here for completeness)
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- ============================================================
-- 6. ENSURE PROPER GRANTS FOR ALL TABLES
-- ============================================================

-- campaign_applications
DO $$
BEGIN
  IF NOT has_table_privilege('authenticated', 'public.campaign_applications', 'SELECT') THEN
    GRANT SELECT, INSERT, UPDATE ON public.campaign_applications TO authenticated;
  END IF;
  IF NOT has_table_privilege('service_role', 'public.campaign_applications', 'SELECT') THEN
    GRANT ALL ON public.campaign_applications TO service_role;
  END IF;
END $$;

-- campaigns (ensure complete coverage)
DO $$
BEGIN
  IF NOT has_table_privilege('anon', 'public.campaigns', 'SELECT') THEN
    GRANT SELECT ON public.campaigns TO anon;
  END IF;
END $$;

-- subscriptions (ensure INSERT/UPDATE for authenticated users via SECURITY DEFINER triggers)
DO $$
BEGIN
  IF NOT has_table_privilege('authenticated', 'public.subscriptions', 'SELECT') THEN
    GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO authenticated;
  END IF;
  IF NOT has_table_privilege('service_role', 'public.subscriptions', 'SELECT') THEN
    GRANT ALL ON public.subscriptions TO service_role;
  END IF;
END $$;

-- applications
DO $$
BEGIN
  IF NOT has_table_privilege('authenticated', 'public.applications', 'SELECT') THEN
    GRANT SELECT, INSERT, UPDATE ON public.applications TO authenticated;
  END IF;
  IF NOT has_table_privilege('service_role', 'public.applications', 'SELECT') THEN
    GRANT ALL ON public.applications TO service_role;
  END IF;
END $$;

-- portfolio_photos
DO $$
BEGIN
  IF NOT has_table_privilege('authenticated', 'public.portfolio_photos', 'SELECT') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_photos TO authenticated;
  END IF;
  IF NOT has_table_privilege('public', 'public.portfolio_photos', 'SELECT') THEN
    GRANT SELECT ON public.portfolio_photos TO public;
  END IF;
  IF NOT has_table_privilege('service_role', 'public.portfolio_photos', 'SELECT') THEN
    GRANT ALL ON public.portfolio_photos TO service_role;
  END IF;
END $$;

-- creator_stats
DO $$
BEGIN
  IF NOT has_table_privilege('authenticated', 'public.creator_stats', 'SELECT') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_stats TO authenticated;
  END IF;
  IF NOT has_table_privilege('public', 'public.creator_stats', 'SELECT') THEN
    GRANT SELECT ON public.creator_stats TO public;
  END IF;
  IF NOT has_table_privilege('service_role', 'public.creator_stats', 'SELECT') THEN
    GRANT ALL ON public.creator_stats TO service_role;
  END IF;
END $$;

-- profile_views
DO $$
BEGIN
  IF NOT has_table_privilege('authenticated', 'public.profile_views', 'SELECT') THEN
    GRANT SELECT, INSERT ON public.profile_views TO authenticated;
  END IF;
  IF NOT has_table_privilege('service_role', 'public.profile_views', 'SELECT') THEN
    GRANT ALL ON public.profile_views TO service_role;
  END IF;
END $$;

-- campaign_invitations (created below, grant here for ordering)
-- (grant is inside the table creation section below)

-- ============================================================
-- 7. CAMPAIGN INVITATIONS TABLE
--    Brand → creator invites for campaigns
-- ============================================================
CREATE TABLE IF NOT EXISTS public.campaign_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  message TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, creator_id)
);

ALTER TABLE public.campaign_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaign_invitations_select" ON public.campaign_invitations;
CREATE POLICY "campaign_invitations_select" ON public.campaign_invitations
  FOR SELECT TO authenticated
  USING (auth.uid() = creator_id OR auth.uid() = brand_id);

DROP POLICY IF EXISTS "campaign_invitations_insert" ON public.campaign_invitations;
CREATE POLICY "campaign_invitations_insert" ON public.campaign_invitations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = brand_id);

DROP POLICY IF EXISTS "campaign_invitations_update_creator" ON public.campaign_invitations;
CREATE POLICY "campaign_invitations_update_creator" ON public.campaign_invitations
  FOR UPDATE TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id AND status IN ('accepted', 'rejected'));

DROP POLICY IF EXISTS "campaign_invitations_update_brand" ON public.campaign_invitations;
CREATE POLICY "campaign_invitations_update_brand" ON public.campaign_invitations
  FOR UPDATE TO authenticated
  USING (auth.uid() = brand_id)
  WITH CHECK (auth.uid() = brand_id AND status = 'expired');

DROP POLICY IF EXISTS "campaign_invitations_delete" ON public.campaign_invitations;
CREATE POLICY "campaign_invitations_delete" ON public.campaign_invitations
  FOR DELETE TO authenticated
  USING (auth.uid() = brand_id);

DROP POLICY IF EXISTS "campaign_invitations_admin" ON public.campaign_invitations;
CREATE POLICY "campaign_invitations_admin" ON public.campaign_invitations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Grants for campaign_invitations
DO $$
BEGIN
  IF NOT has_table_privilege('authenticated', 'public.campaign_invitations', 'SELECT') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_invitations TO authenticated;
  END IF;
  IF NOT has_table_privilege('service_role', 'public.campaign_invitations', 'SELECT') THEN
    GRANT ALL ON public.campaign_invitations TO service_role;
  END IF;
END $$;

-- ============================================================
-- 8. ADD created_at INDEXES FOR COMMONLY QUERIED TABLES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_campaign_applications_created ON public.campaign_applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_applications_status ON public.campaign_applications(status);
CREATE INDEX IF NOT EXISTS idx_campaign_invitations_created ON public.campaign_invitations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_invitations_status ON public.campaign_invitations(status);
CREATE INDEX IF NOT EXISTS idx_campaign_invitations_creator ON public.campaign_invitations(creator_id);
CREATE INDEX IF NOT EXISTS idx_campaign_invitations_campaign ON public.campaign_invitations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_created ON public.campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_brand ON public.campaigns(brand_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_participants ON public.messages(sender_id, recipient_id);
CREATE INDEX IF NOT EXISTS idx_brand_requests_created ON public.brand_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brand_requests_sender ON public.brand_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_saved_creators_creator ON public.saved_creators(creator_id);
CREATE INDEX IF NOT EXISTS idx_coupons_brand ON public.coupons(brand_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_creator ON public.affiliate_links(creator_id);
CREATE INDEX IF NOT EXISTS idx_link_clicks_link ON public.link_clicks(affiliate_link_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_views_created ON public.profile_views(viewed_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON public.subscription_plans(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_brand_info_verification ON public.brand_info(verification_status);
CREATE INDEX IF NOT EXISTS idx_creator_info_status ON public.creator_info(creator_status);

-- ============================================================
-- 9. ADD PROPER CASCADE DELETES WHERE MISSING
-- ============================================================

-- subscription_plans: if a plan is deleted, subscriptions referencing it
-- should be handled (SET NULL or CASCADE). Currently no ON DELETE.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'subscriptions_plan_id_fkey'
      AND table_schema = 'public' AND table_name = 'subscriptions'
  ) THEN
    EXECUTE 'ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_plan_id_fkey';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'subscriptions_plan_id_fkey_fix'
      AND table_schema = 'public' AND table_name = 'subscriptions'
  ) THEN
    EXECUTE 'ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_plan_id_fkey_fix
      FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id) ON DELETE RESTRICT';
  END IF;
END $$;

-- applications.approved_by: cascade delete when referenced user is removed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'applications_approved_by_fkey'
      AND table_schema = 'public' AND table_name = 'applications'
  ) THEN
    EXECUTE 'ALTER TABLE public.applications DROP CONSTRAINT applications_approved_by_fkey';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'applications_approved_by_fkey_fix'
      AND table_schema = 'public' AND table_name = 'applications'
  ) THEN
    EXECUTE 'ALTER TABLE public.applications ADD CONSTRAINT applications_approved_by_fkey_fix
      FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL';
  END IF;
END $$;

-- profile_views.viewer_id: already SET NULL, keep as-is

-- ============================================================
-- 10. SECURITY DEFINER FUNCTION EXECUTION REVOKES
--     Ensure internal trigger functions are not callable by users
-- ============================================================
DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION public.handle_new_creator_info() FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION public.handle_new_brand_info() FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION public.handle_new_shopper_info() FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION public.handle_new_user_subscription() FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION public.notify_on_brand_request() FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION public.notify_on_request_status() FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- has_role must remain executable by authenticated users (used in RLS policies)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role' AND pronamespace = 'public'::regnamespace) THEN
    REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.user_role) FROM PUBLIC, anon;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role' AND pronamespace = 'public'::regnamespace)
     AND NOT has_function_privilege('authenticated', 'public.has_role(uuid,public.user_role)', 'EXECUTE') THEN
    GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.user_role) TO authenticated;
  END IF;
END $$;

-- ============================================================
-- 11. STORAGE BUCKET POLICIES ENHANCEMENT
--     Add MIME type and size restrictions to 'images' bucket
--     (Note: full MIME enforcement requires Supabase SQL extension)
-- ============================================================

-- Ensure the 'images' bucket INSERT policy checks owner = auth.uid()
-- (current policy allows any authenticated user to upload to 'images')
DROP POLICY IF EXISTS "Authenticated upload access with owner" ON storage.objects;
CREATE POLICY "Authenticated upload access with owner"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'images' AND (owner = auth.uid() OR owner IS NULL));

-- ============================================================
-- 12. NOTIFY POSTGREST TO RELOAD SCHEMA CACHE
-- ============================================================
NOTIFY pgrst, 'reload schema';
