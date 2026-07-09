-- Trust & Safety Features for Collabrandly
-- Adds reputation, audience quality, audience matching, deal cards, and paid report tracking

-- =====================================================================
-- 1. CREATOR REPUTATION (Function 1)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.creator_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('completed', 'failed')),
  complaint TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creator_reviews_creator ON public.creator_reviews(creator_id);

-- Add reputation columns to profiles (admin-managed, auto-updated on review)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS completed_deals INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS complaints_count INTEGER NOT NULL DEFAULT 0;

-- =====================================================================
-- 2. AUDIENCE QUALITY INDICATOR (Function 2)
-- =====================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS audience_quality TEXT DEFAULT 'green'
    CHECK (audience_quality IN ('green', 'yellow', 'red'));

-- =====================================================================
-- 3. AUDIENCE DEMOGRAPHICS (Function 3)
-- =====================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS audience_gender TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS audience_age TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS audience_cities TEXT DEFAULT '';

-- Buyer persona for brands
CREATE TABLE IF NOT EXISTS public.buyer_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  target_gender TEXT DEFAULT '',
  target_age TEXT DEFAULT '',
  target_city TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- 4. DEAL CARDS (Function 4)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  deadline TIMESTAMPTZ,
  brand_confirmed BOOLEAN NOT NULL DEFAULT false,
  creator_confirmed BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'completed', 'dispute')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deals_brand ON public.deals(brand_id);
CREATE INDEX IF NOT EXISTS idx_deals_creator ON public.deals(creator_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON public.deals(status);

-- =====================================================================
-- 5. PAID REPORT TRACKING (Function 5)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.report_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'clicked'
    CHECK (status IN ('clicked', 'started_payment', 'completed_payment', 'cancelled')),
  payment_method TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_requests_brand ON public.report_requests(brand_id);

-- =====================================================================
-- RLS POLICIES
-- =====================================================================

-- Creator reviews
ALTER TABLE public.creator_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read creator reviews" ON public.creator_reviews;
CREATE POLICY "Anyone can read creator reviews" ON public.creator_reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Brands can insert reviews" ON public.creator_reviews;
CREATE POLICY "Brands can insert reviews" ON public.creator_reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reviewer_id);

DROP POLICY IF EXISTS "Admins manage reviews" ON public.creator_reviews;
CREATE POLICY "Admins manage reviews" ON public.creator_reviews
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Buyer personas
ALTER TABLE public.buyer_personas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brands manage own persona" ON public.buyer_personas;
CREATE POLICY "Brands manage own persona" ON public.buyer_personas
  FOR ALL TO authenticated
  USING (auth.uid() = brand_id)
  WITH CHECK (auth.uid() = brand_id);

DROP POLICY IF EXISTS "Admins view all personas" ON public.buyer_personas;
CREATE POLICY "Admins view all personas" ON public.buyer_personas
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Deals
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants read deals" ON public.deals;
CREATE POLICY "Participants read deals" ON public.deals
  FOR SELECT TO authenticated
  USING (auth.uid() = brand_id OR auth.uid() = creator_id);

DROP POLICY IF EXISTS "Brands create deals" ON public.deals;
CREATE POLICY "Brands create deals" ON public.deals
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = brand_id);

DROP POLICY IF EXISTS "Participants update deals" ON public.deals;
CREATE POLICY "Participants update deals" ON public.deals
  FOR UPDATE TO authenticated
  USING (auth.uid() = brand_id OR auth.uid() = creator_id)
  WITH CHECK (auth.uid() = brand_id OR auth.uid() = creator_id);

DROP POLICY IF EXISTS "Admins manage deals" ON public.deals;
CREATE POLICY "Admins manage deals" ON public.deals
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Report requests
ALTER TABLE public.report_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brands manage own report requests" ON public.report_requests;
CREATE POLICY "Brands manage own report requests" ON public.report_requests
  FOR ALL TO authenticated
  USING (auth.uid() = brand_id)
  WITH CHECK (auth.uid() = brand_id);

DROP POLICY IF EXISTS "Admins view all report requests" ON public.report_requests;
CREATE POLICY "Admins view all report requests" ON public.report_requests
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================================
-- GRANTS
-- =====================================================================

GRANT SELECT, INSERT, UPDATE ON public.creator_reviews TO authenticated;
GRANT ALL ON public.creator_reviews TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyer_personas TO authenticated;
GRANT ALL ON public.buyer_personas TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.deals TO authenticated;
GRANT ALL ON public.deals TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.report_requests TO authenticated;
GRANT ALL ON public.report_requests TO service_role;

-- =====================================================================
-- TRIGGER: Update reputation on review insert
-- =====================================================================

CREATE OR REPLACE FUNCTION public.update_creator_reputation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'completed' THEN
      UPDATE public.profiles
      SET completed_deals = completed_deals + 1
      WHERE id = NEW.creator_id;
    ELSIF NEW.status = 'failed' THEN
      UPDATE public.profiles
      SET complaints_count = complaints_count + 1
      WHERE id = NEW.creator_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_creator_review_inserted ON public.creator_reviews;
CREATE TRIGGER on_creator_review_inserted
  AFTER INSERT ON public.creator_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_creator_reputation();

-- Auto-update deal status when both confirm
CREATE OR REPLACE FUNCTION public.check_deal_confirmation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.brand_confirmed AND NEW.creator_confirmed AND OLD.status = 'pending' THEN
    NEW.status = 'confirmed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_deal_confirmation ON public.deals;
CREATE TRIGGER on_deal_confirmation
  BEFORE UPDATE ON public.deals
  FOR EACH ROW
  WHEN (NEW.brand_confirmed AND NEW.creator_confirmed AND OLD.status = 'pending')
  EXECUTE FUNCTION public.check_deal_confirmation();
