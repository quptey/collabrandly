-- =====================================================================
-- Campaign Marketplace — Collabrandly
-- Enhanced campaigns table, public browsing, creator applications
-- Idempotent (safe to run multiple times)
-- =====================================================================

-- ============================================================
-- 1. Fix campaign_status enum to include 'archived'
-- ============================================================
ALTER TYPE public.campaign_status ADD VALUE IF NOT EXISTS 'archived';

-- ============================================================
-- 2. Add enhanced columns to campaigns table
-- ============================================================
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS platform text DEFAULT '';
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS category text DEFAULT '';
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS deliverables text DEFAULT '';
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS target_followers text DEFAULT '';
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS deadline text DEFAULT '';
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS compensation_type text DEFAULT '';

COMMENT ON COLUMN public.campaigns.platform IS 'Target platform: instagram, tiktok, youtube, etc.';
COMMENT ON COLUMN public.campaigns.category IS 'Category/niche: beauty, fashion, fitness, etc.';
COMMENT ON COLUMN public.campaigns.deliverables IS 'What creators need to deliver';
COMMENT ON COLUMN public.campaigns.target_followers IS 'Minimum follower count required';
COMMENT ON COLUMN public.campaigns.deadline IS 'Campaign submission deadline';
COMMENT ON COLUMN public.campaigns.compensation_type IS 'fixed, barter, commission';

-- ============================================================
-- 3. Add updated_at trigger for campaign_applications
-- ============================================================
DROP TRIGGER IF EXISTS campaign_applications_updated ON public.campaign_applications;
CREATE TRIGGER campaign_applications_updated
  BEFORE UPDATE ON public.campaign_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 4. RLS: Allow authenticated users (creators) to SELECT active campaigns
-- ============================================================
DROP POLICY IF EXISTS "campaigns_select_all_active" ON public.campaigns;
CREATE POLICY "campaigns_select_all_active" ON public.campaigns
  FOR SELECT TO authenticated
  USING (status = 'active' OR brand_id = auth.uid());

-- Allow anon to see public campaign listings
DROP POLICY IF EXISTS "campaigns_select_anon" ON public.campaigns;
CREATE POLICY "campaigns_select_anon" ON public.campaigns
  FOR SELECT TO anon
  USING (status = 'active');

-- ============================================================
-- 5. Index on new columns for efficient filtering
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_campaigns_platform ON public.campaigns(platform);
CREATE INDEX IF NOT EXISTS idx_campaigns_category ON public.campaigns(category);
CREATE INDEX IF NOT EXISTS idx_campaigns_compensation ON public.campaigns(compensation_type);

-- ============================================================
-- 6. Grant proper permissions
-- ============================================================
GRANT SELECT ON public.campaign_applications TO authenticated;
GRANT INSERT ON public.campaign_applications TO authenticated;
GRANT UPDATE ON public.campaign_applications TO authenticated;
