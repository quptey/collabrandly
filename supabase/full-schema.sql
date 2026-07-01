-- =====================================================================
-- Merged Idempotent Schema — Collabrandly
-- Generated from 6 migration files (safe to run multiple times)
-- =====================================================================

-- 1. ENUMS (pg_type existence check)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.user_role AS ENUM ('creator', 'brand', 'admin');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'creator_category' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.creator_category AS ENUM ('beauty', 'fashion', 'fitness', 'lifestyle', 'travel', 'food', 'technology', 'gaming', 'business', 'education', 'music', 'sports', 'photography', 'entertainment', 'marketing', 'other');
  END IF;
END $$;

-- Add new category values idempotently
DO $$ BEGIN
  ALTER TYPE public.creator_category ADD VALUE IF NOT EXISTS 'travel';
  ALTER TYPE public.creator_category ADD VALUE IF NOT EXISTS 'technology';
  ALTER TYPE public.creator_category ADD VALUE IF NOT EXISTS 'gaming';
  ALTER TYPE public.creator_category ADD VALUE IF NOT EXISTS 'business';
  ALTER TYPE public.creator_category ADD VALUE IF NOT EXISTS 'education';
  ALTER TYPE public.creator_category ADD VALUE IF NOT EXISTS 'music';
  ALTER TYPE public.creator_category ADD VALUE IF NOT EXISTS 'sports';
  ALTER TYPE public.creator_category ADD VALUE IF NOT EXISTS 'photography';
  ALTER TYPE public.creator_category ADD VALUE IF NOT EXISTS 'entertainment';
  ALTER TYPE public.creator_category ADD VALUE IF NOT EXISTS 'marketing';
  ALTER TYPE public.creator_category ADD VALUE IF NOT EXISTS 'other';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kz_city' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.kz_city AS ENUM ('Almaty', 'Astana', 'Shymkent', 'Aktau', 'Aktobe', 'Atyrau', 'Karaganda', 'Kokshetau', 'Kostanay', 'Kyzylorda', 'Oral', 'Oskemen', 'Pavlodar', 'Petropavlovsk', 'Semey', 'Taldykorgan', 'Taraz', 'Turkistan', 'Ekibastuz', 'Rudny', 'Temirtau');
  END IF;
END $$;

DO $$ BEGIN
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
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'follower_range' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.follower_range AS ENUM ('1K-10K', '10K-50K', '50K-200K', '200K+');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'budget_range' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.budget_range AS ENUM ('< 100K KZT', '100K-500K KZT', '500K-1M KZT', '1M+ KZT');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.request_status AS ENUM ('pending', 'accepted', 'rejected');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campaign_status' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.campaign_status AS ENUM ('draft', 'active', 'closed');
  END IF;
END $$;

-- 2. ALTER ENUM (already idempotent)
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'shopper';

-- =====================================================================
-- 3. TABLES  (IF NOT EXISTS)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'creator',
  display_name TEXT NOT NULL DEFAULT '',
  bio TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  social_link TEXT DEFAULT '',
  category public.creator_category,
  custom_category TEXT DEFAULT '',
  city public.kz_city,
  follower_range public.follower_range,
  brand_name TEXT DEFAULT '',
  contact_person TEXT DEFAULT '',
  onboarded BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  cover_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT DEFAULT '',
  external_link TEXT DEFAULT '',
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.brand_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  brand_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  budget_range public.budget_range NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE TABLE IF NOT EXISTS public.saved_creators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(brand_id, creator_id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text DEFAULT '',
  link text DEFAULT '',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  brief text DEFAULT '',
  budget_range text DEFAULT '',
  status public.campaign_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.affiliate_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  url text NOT NULL,
  code text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.link_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_link_id uuid NOT NULL REFERENCES public.affiliate_links(id) ON DELETE CASCADE,
  referrer text DEFAULT '',
  user_agent text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  discount_percent int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KZT',
  role TEXT NOT NULL CHECK (role IN ('creator', 'brand')),
  features JSONB NOT NULL DEFAULT '[]',
  limitations JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- =====================================================================
-- 4. ALTER TABLE ADD COLUMN  (IF NOT EXISTS)
-- =====================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS follower_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS instagram_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS tiktok_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS website text DEFAULT '',
  ADD COLUMN IF NOT EXISTS industry text DEFAULT '',
  ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'active'
    CHECK (verification_status IN ('active', 'pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS rejection_reason text DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone text DEFAULT '',
  ADD COLUMN IF NOT EXISTS social_platform text DEFAULT '';

ALTER TABLE public.brand_requests
  ADD COLUMN IF NOT EXISTS status public.request_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS goal text DEFAULT '';

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS description text DEFAULT '';

-- =====================================================================
-- 5. GRANT ON TABLES  (has_table_privilege check)
-- =====================================================================

DO $$ BEGIN
  IF NOT has_table_privilege('anon', 'public.profiles', 'SELECT') THEN
    GRANT SELECT ON public.profiles TO anon;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT has_table_privilege('authenticated', 'public.profiles', 'SELECT,INSERT,UPDATE,DELETE') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT has_table_privilege('service_role', 'public.profiles', 'SELECT') THEN
    GRANT ALL ON public.profiles TO service_role;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT has_table_privilege('anon', 'public.collections', 'SELECT') THEN
    GRANT SELECT ON public.collections TO anon;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT has_table_privilege('authenticated', 'public.collections', 'SELECT,INSERT,UPDATE,DELETE') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.collections TO authenticated;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT has_table_privilege('service_role', 'public.collections', 'SELECT') THEN
    GRANT ALL ON public.collections TO service_role;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT has_table_privilege('anon', 'public.products', 'SELECT') THEN
    GRANT SELECT ON public.products TO anon;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT has_table_privilege('authenticated', 'public.products', 'SELECT,INSERT,UPDATE,DELETE') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT has_table_privilege('service_role', 'public.products', 'SELECT') THEN
    GRANT ALL ON public.products TO service_role;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT has_table_privilege('authenticated', 'public.brand_requests', 'SELECT,INSERT,UPDATE,DELETE') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_requests TO authenticated;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT has_table_privilege('service_role', 'public.brand_requests', 'SELECT') THEN
    GRANT ALL ON public.brand_requests TO service_role;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT has_table_privilege('authenticated', 'public.user_roles', 'SELECT') THEN
    GRANT SELECT ON public.user_roles TO authenticated;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT has_table_privilege('service_role', 'public.user_roles', 'SELECT') THEN
    GRANT ALL ON public.user_roles TO service_role;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT has_table_privilege('authenticated', 'public.saved_creators', 'SELECT,INSERT,DELETE') THEN
    GRANT SELECT, INSERT, DELETE ON public.saved_creators TO authenticated;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT has_table_privilege('service_role', 'public.saved_creators', 'SELECT') THEN
    GRANT ALL ON public.saved_creators TO service_role;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT has_table_privilege('authenticated', 'public.notifications', 'SELECT,UPDATE') THEN
    GRANT SELECT, UPDATE ON public.notifications TO authenticated;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT has_table_privilege('service_role', 'public.notifications', 'SELECT') THEN
    GRANT ALL ON public.notifications TO service_role;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT has_table_privilege('authenticated', 'public.campaigns', 'SELECT,INSERT,UPDATE,DELETE') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT has_table_privilege('service_role', 'public.campaigns', 'SELECT') THEN
    GRANT ALL ON public.campaigns TO service_role;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT has_table_privilege('authenticated', 'public.affiliate_links', 'SELECT,INSERT,UPDATE,DELETE') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_links TO authenticated;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT has_table_privilege('service_role', 'public.affiliate_links', 'SELECT') THEN
    GRANT ALL ON public.affiliate_links TO service_role;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT has_table_privilege('authenticated', 'public.link_clicks', 'SELECT') THEN
    GRANT SELECT ON public.link_clicks TO authenticated;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT has_table_privilege('service_role', 'public.link_clicks', 'SELECT') THEN
    GRANT ALL ON public.link_clicks TO service_role;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT has_table_privilege('authenticated', 'public.coupons', 'SELECT,INSERT,UPDATE,DELETE') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT has_table_privilege('service_role', 'public.coupons', 'SELECT') THEN
    GRANT ALL ON public.coupons TO service_role;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT has_table_privilege('authenticated', 'public.messages', 'SELECT,INSERT,UPDATE') THEN
    GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT has_table_privilege('service_role', 'public.messages', 'SELECT') THEN
    GRANT ALL ON public.messages TO service_role;
  END IF;
END $$;

-- subscription_plans / subscriptions grants
DO $$ BEGIN
  IF NOT has_table_privilege('anon', 'subscription_plans', 'SELECT') THEN
    REVOKE ALL ON subscription_plans FROM anon;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT has_table_privilege('anon', 'subscriptions', 'SELECT') THEN
    REVOKE ALL ON subscriptions FROM anon;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT has_table_privilege('authenticated', 'subscription_plans', 'SELECT') THEN
    GRANT SELECT ON subscription_plans TO authenticated;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT has_table_privilege('authenticated', 'subscriptions', 'SELECT,INSERT,UPDATE') THEN
    GRANT SELECT, INSERT, UPDATE ON subscriptions TO authenticated;
  END IF;
END $$;

-- =====================================================================
-- 6. ROW LEVEL SECURITY  (check relrowsecurity before enabling)
-- =====================================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE oid = 'public.profiles'::regclass AND NOT relrowsecurity) THEN
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE oid = 'public.collections'::regclass AND NOT relrowsecurity) THEN
    ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE oid = 'public.products'::regclass AND NOT relrowsecurity) THEN
    ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE oid = 'public.brand_requests'::regclass AND NOT relrowsecurity) THEN
    ALTER TABLE public.brand_requests ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE oid = 'public.user_roles'::regclass AND NOT relrowsecurity) THEN
    ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE oid = 'public.saved_creators'::regclass AND NOT relrowsecurity) THEN
    ALTER TABLE public.saved_creators ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE oid = 'public.notifications'::regclass AND NOT relrowsecurity) THEN
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE oid = 'public.campaigns'::regclass AND NOT relrowsecurity) THEN
    ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE oid = 'public.affiliate_links'::regclass AND NOT relrowsecurity) THEN
    ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE oid = 'public.link_clicks'::regclass AND NOT relrowsecurity) THEN
    ALTER TABLE public.link_clicks ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE oid = 'public.coupons'::regclass AND NOT relrowsecurity) THEN
    ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE oid = 'public.messages'::regclass AND NOT relrowsecurity) THEN
    ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE oid = 'subscription_plans'::regclass AND NOT relrowsecurity) THEN
    ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE oid = 'subscriptions'::regclass AND NOT relrowsecurity) THEN
    ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- =====================================================================
-- 7. POLICIES  (DROP IF EXISTS before each CREATE)
-- =====================================================================

DROP POLICY IF EXISTS "Profiles are publicly viewable" ON public.profiles;
CREATE POLICY "Profiles are publicly viewable"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Collections are publicly viewable" ON public.collections;
CREATE POLICY "Collections are publicly viewable"
  ON public.collections FOR SELECT USING (true);

DROP POLICY IF EXISTS "Creators manage their own collections" ON public.collections;
CREATE POLICY "Creators manage their own collections"
  ON public.collections FOR ALL
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Products are publicly viewable" ON public.products;
CREATE POLICY "Products are publicly viewable"
  ON public.products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Creators manage their own products" ON public.products;
CREATE POLICY "Creators manage their own products"
  ON public.products FOR ALL
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creator can view requests sent to them" ON public.brand_requests;
CREATE POLICY "Creator can view requests sent to them"
  ON public.brand_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = creator_id OR auth.uid() = sender_id);

DROP POLICY IF EXISTS "Authenticated users can send requests" ON public.brand_requests;
CREATE POLICY "Authenticated users can send requests"
  ON public.brand_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.user_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

DROP POLICY IF EXISTS "users read own roles" ON public.user_roles;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Creator can update request status" ON public.brand_requests;
CREATE POLICY "Creator can update request status" ON public.brand_requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Brand sees own saves" ON public.saved_creators;
CREATE POLICY "Brand sees own saves" ON public.saved_creators FOR SELECT TO authenticated USING (auth.uid() = brand_id);

DROP POLICY IF EXISTS "Brand creates own save" ON public.saved_creators;
CREATE POLICY "Brand creates own save" ON public.saved_creators FOR INSERT TO authenticated WITH CHECK (auth.uid() = brand_id);

DROP POLICY IF EXISTS "Brand deletes own save" ON public.saved_creators;
CREATE POLICY "Brand deletes own save" ON public.saved_creators FOR DELETE TO authenticated USING (auth.uid() = brand_id);

DROP POLICY IF EXISTS "User reads own notifications" ON public.notifications;
CREATE POLICY "User reads own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "User updates own notifications" ON public.notifications;
CREATE POLICY "User updates own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Brand manages own campaigns" ON public.campaigns;
CREATE POLICY "Brand manages own campaigns" ON public.campaigns FOR ALL TO authenticated USING (auth.uid() = brand_id) WITH CHECK (auth.uid() = brand_id);

DROP POLICY IF EXISTS "Creator manages own affiliate links" ON public.affiliate_links;
CREATE POLICY "Creator manages own affiliate links" ON public.affiliate_links FOR ALL TO authenticated USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creator reads own link clicks" ON public.link_clicks;
CREATE POLICY "Creator reads own link clicks" ON public.link_clicks FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.affiliate_links a WHERE a.id = affiliate_link_id AND a.creator_id = auth.uid()));

DROP POLICY IF EXISTS "Brand manages own coupons" ON public.coupons;
CREATE POLICY "Brand manages own coupons" ON public.coupons FOR ALL TO authenticated USING (auth.uid() = brand_id) WITH CHECK (auth.uid() = brand_id);

DROP POLICY IF EXISTS "Participants read messages" ON public.messages;
CREATE POLICY "Participants read messages" ON public.messages FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Sender writes messages" ON public.messages;
CREATE POLICY "Sender writes messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Recipient marks read" ON public.messages;
CREATE POLICY "Recipient marks read" ON public.messages FOR UPDATE TO authenticated USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Anyone can read subscription plans" ON subscription_plans;
CREATE POLICY "Anyone can read subscription plans"
  ON subscription_plans FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can read own subscription" ON subscriptions;
CREATE POLICY "Users can read own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- =====================================================================
-- 8. FUNCTIONS  (CREATE OR REPLACE — already idempotent)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
END $$;

CREATE OR REPLACE FUNCTION public.notify_on_brand_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (NEW.creator_id, 'brand_request',
    'New brand request from ' || NEW.brand_name,
    COALESCE(NEW.message, ''), '/dashboard');
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.notify_on_request_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.sender_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (NEW.sender_id, 'request_status',
      'Your request was ' || NEW.status::text,
      'Creator updated your collaboration request.', '/brand');
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_plan_id UUID;
BEGIN
  IF NEW.role = 'brand' THEN
    SELECT id INTO v_plan_id FROM subscription_plans WHERE key = 'brand' LIMIT 1;
  ELSE
    SELECT id INTO v_plan_id FROM subscription_plans WHERE key = 'free_creator' LIMIT 1;
  END IF;

  INSERT INTO subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
  VALUES (NEW.id, v_plan_id, 'active', now(), NULL);
  RETURN NEW;
END;
$$;

-- =====================================================================
-- 9. SEED DATA  (MUST be before triggers that reference it)
-- =====================================================================

INSERT INTO subscription_plans (key, name, description, price_monthly, currency, role, features, limitations, sort_order) VALUES
  ('free_creator', 'Free', 'For creators starting out.', 0, 'KZT', 'creator',
   '["Create profile", "Up to 3 collections", "Up to 15 products", "Receive collaboration requests", "Public creator page"]',
   '{"max_collections": 3, "max_products": 15, "has_analytics": false, "priority_ranking": false}',
   1),
  ('creator_pro', 'Creator Pro', 'Unlimited collections, priority discovery.', 3900, 'KZT', 'creator',
   '["Unlimited collections", "Unlimited products", "Priority placement in search results", "PRO badge", "Profile analytics", "Creator insights", "Featured creator section"]',
   '{"max_collections": -1, "max_products": -1, "has_analytics": true, "priority_ranking": true}',
   2),
  ('brand', 'Brand', 'Find creators faster, manage campaigns.', 9900, 'KZT', 'brand',
   '["Unlimited creator search", "Advanced filters", "Save creators", "Unlimited collaboration requests", "Campaign management", "Creator shortlist"]',
   '{"unlimited_search": true, "advanced_filters": true, "unlimited_requests": true, "campaign_management": true}',
   3)
ON CONFLICT (key) DO NOTHING;

-- =====================================================================
-- 10. TRIGGERS  (DROP IF EXISTS + CREATE)
-- =====================================================================

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS collections_updated_at ON public.collections;
CREATE TRIGGER collections_updated_at BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS campaigns_updated ON public.campaigns;
CREATE TRIGGER campaigns_updated BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS brand_request_inserted ON public.brand_requests;
CREATE TRIGGER brand_request_inserted AFTER INSERT ON public.brand_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_brand_request();

DROP TRIGGER IF EXISTS brand_request_status_changed ON public.brand_requests;
CREATE TRIGGER brand_request_status_changed AFTER UPDATE ON public.brand_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_request_status();

DROP TRIGGER IF EXISTS on_profile_create_subscription ON public.profiles;
CREATE TRIGGER on_profile_create_subscription
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_subscription();

-- =====================================================================
-- 10b. APPLICATIONS TABLE
-- =====================================================================

DROP TABLE IF EXISTS public.applications CASCADE;

CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('creator', 'brand')),
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  social_link TEXT NOT NULL DEFAULT '',
  company_name TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own application" ON public.applications;
CREATE POLICY "Users read own application" ON public.applications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins read all applications" ON public.applications;
CREATE POLICY "Admins read all applications" ON public.applications
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update applications" ON public.applications;
CREATE POLICY "Admins update applications" ON public.applications
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role manages applications" ON public.applications;
CREATE POLICY "Service role manages applications" ON public.applications
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.applications TO authenticated;
GRANT UPDATE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;

-- =====================================================================
-- 10c. REPORTS TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type TEXT NOT NULL CHECK (user_type IN ('creator', 'brand')),
  reason TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own reports" ON public.reports;
CREATE POLICY "Users insert own reports" ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users read own reports" ON public.reports;
CREATE POLICY "Users read own reports" ON public.reports
  FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Admins read all reports" ON public.reports;
CREATE POLICY "Admins read all reports" ON public.reports
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update reports" ON public.reports;
CREATE POLICY "Admins update reports" ON public.reports
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;

CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reported ON public.reports(reported_id);

-- =====================================================================
-- 11. INDEXES  (IF NOT EXISTS)
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_role ON public.applications(role);
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON public.applications(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_category ON public.profiles(category);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_category TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_profiles_city ON public.profiles(city);
CREATE INDEX IF NOT EXISTS idx_collections_creator ON public.collections(creator_id);
CREATE INDEX IF NOT EXISTS idx_products_collection ON public.products(collection_id);
CREATE INDEX IF NOT EXISTS idx_brand_requests_creator ON public.brand_requests(creator_id);

-- =====================================================================
-- 12. REVOKE / GRANT EXECUTE ON FUNCTIONS  (wrapped in DO blocks)
-- =====================================================================

DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role' AND pronamespace = 'public'::regnamespace) THEN
    REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.user_role) FROM PUBLIC, anon;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role' AND pronamespace = 'public'::regnamespace)
     AND NOT has_function_privilege('authenticated', 'public.has_role(uuid,public.user_role)', 'EXECUTE') THEN
    GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.user_role) TO authenticated;
  END IF;
END $$;

DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.notify_on_brand_request() FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.notify_on_request_status() FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.handle_new_user_subscription() FROM PUBLIC, anon;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  IF NOT has_function_privilege('authenticated', 'public.handle_new_user_subscription()', 'EXECUTE') THEN
    GRANT EXECUTE ON FUNCTION public.handle_new_user_subscription() TO authenticated;
  END IF;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- Add 'admin' to existing enum (separate statement — must be outside DO block)
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin';

-- =====================================================================
-- 13. Secure User Management (20260626000000)
-- =====================================================================

-- Profiles enhancements
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Creator info
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

-- Brand info
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

-- Shopper info
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

-- Applications enhancements
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT '';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_creator_info_user_id ON public.creator_info(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_info_user_id ON public.brand_info(user_id);
CREATE INDEX IF NOT EXISTS idx_shopper_info_user_id ON public.shopper_info(user_id);

-- RLS
ALTER TABLE public.creator_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopper_info ENABLE ROW LEVEL SECURITY;

-- Creator Info Policies
DROP POLICY IF EXISTS "Users view own creator_info" ON public.creator_info;
CREATE POLICY "Users view own creator_info" ON public.creator_info
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own creator_info" ON public.creator_info;
CREATE POLICY "Users insert own creator_info" ON public.creator_info
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own creator_info" ON public.creator_info;
CREATE POLICY "Users update own creator_info" ON public.creator_info
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins view all creator_info" ON public.creator_info;
CREATE POLICY "Admins view all creator_info" ON public.creator_info
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins update creator_info" ON public.creator_info;
CREATE POLICY "Admins update creator_info" ON public.creator_info
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Service role manages creator_info" ON public.creator_info;
CREATE POLICY "Service role manages creator_info" ON public.creator_info
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Brand Info Policies
DROP POLICY IF EXISTS "Users view own brand_info" ON public.brand_info;
CREATE POLICY "Users view own brand_info" ON public.brand_info
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own brand_info" ON public.brand_info;
CREATE POLICY "Users insert own brand_info" ON public.brand_info
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own brand_info" ON public.brand_info;
CREATE POLICY "Users update own brand_info" ON public.brand_info
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins view all brand_info" ON public.brand_info;
CREATE POLICY "Admins view all brand_info" ON public.brand_info
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins update brand_info" ON public.brand_info;
CREATE POLICY "Admins update brand_info" ON public.brand_info
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Service role manages brand_info" ON public.brand_info;
CREATE POLICY "Service role manages brand_info" ON public.brand_info
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Shopper Info Policies
DROP POLICY IF EXISTS "Users view own shopper_info" ON public.shopper_info;
CREATE POLICY "Users view own shopper_info" ON public.shopper_info
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own shopper_info" ON public.shopper_info;
CREATE POLICY "Users insert own shopper_info" ON public.shopper_info
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own shopper_info" ON public.shopper_info;
CREATE POLICY "Users update own shopper_info" ON public.shopper_info
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins view all shopper_info" ON public.shopper_info;
CREATE POLICY "Admins view all shopper_info" ON public.shopper_info
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Service role manages shopper_info" ON public.shopper_info;
CREATE POLICY "Service role manages shopper_info" ON public.shopper_info
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Grants
GRANT SELECT, INSERT, UPDATE ON public.creator_info TO authenticated;
GRANT ALL ON public.creator_info TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.brand_info TO authenticated;
GRANT ALL ON public.brand_info TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.shopper_info TO authenticated;
GRANT ALL ON public.shopper_info TO service_role;

-- Updated handle_new_user with first_name/last_name/email/email_verified
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
  IF v_role = 'shopper' THEN v_status := 'active';
  ELSIF v_role IN ('creator', 'brand') THEN v_status := 'pending';
  ELSE v_status := 'active'; END IF;
  v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  v_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  INSERT INTO public.profiles (id, role, display_name, verification_status, first_name, last_name, email, email_verified)
  VALUES (NEW.id, v_role, v_display_name, v_status, v_first_name, v_last_name, NEW.email, NEW.email_confirmed_at IS NOT NULL)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Auto-create creator_info on profile insert
CREATE OR REPLACE FUNCTION public.handle_new_creator_info()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role = 'creator' THEN
    INSERT INTO public.creator_info (user_id, bio, instagram_url, tiktok_url, content_category, audience_size)
    VALUES (NEW.id, COALESCE(NEW.bio, ''), COALESCE(NEW.instagram_url, ''), COALESCE(NEW.tiktok_url, ''), COALESCE(NEW.category::text, ''), COALESCE(NEW.follower_range::text, ''))
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_create_creator_info ON public.profiles;
CREATE TRIGGER on_profile_create_creator_info
  AFTER INSERT ON public.profiles FOR EACH ROW
  WHEN (NEW.role = 'creator')
  EXECUTE FUNCTION public.handle_new_creator_info();

-- Auto-create brand_info on profile insert
CREATE OR REPLACE FUNCTION public.handle_new_brand_info()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role = 'brand' THEN
    INSERT INTO public.brand_info (user_id, company_name, company_logo, business_email, phone, website, industry, company_description, verification_status)
    VALUES (NEW.id, COALESCE(NEW.brand_name, ''), COALESCE(NEW.avatar_url, ''), COALESCE(NEW.email, ''), COALESCE(NEW.phone, ''), COALESCE(NEW.website, ''), COALESCE(NEW.industry, ''), COALESCE(NEW.bio, ''), COALESCE(NEW.verification_status, 'pending'))
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_create_brand_info ON public.profiles;
CREATE TRIGGER on_profile_create_brand_info
  AFTER INSERT ON public.profiles FOR EACH ROW
  WHEN (NEW.role = 'brand')
  EXECUTE FUNCTION public.handle_new_brand_info();

-- Auto-create shopper_info on profile insert
CREATE OR REPLACE FUNCTION public.handle_new_shopper_info()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role = 'shopper' THEN
    INSERT INTO public.shopper_info (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_create_shopper_info ON public.profiles;
CREATE TRIGGER on_profile_create_shopper_info
  AFTER INSERT ON public.profiles FOR EACH ROW
  WHEN (NEW.role = 'shopper')
  EXECUTE FUNCTION public.handle_new_shopper_info();

-- Last login RPC
CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles SET last_login = now() WHERE id = auth.uid();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_last_login() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_last_login() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_creator_info() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_brand_info() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_shopper_info() FROM PUBLIC, anon, authenticated;
