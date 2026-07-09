-- Analytics, Disputes & Seed Data features

-- =====================================================================
-- 1. ANALYTICS EVENTS (Function 6)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL DEFAULT '',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON public.analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON public.analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON public.analytics_events(user_id);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert analytics events" ON public.analytics_events;
CREATE POLICY "Anyone can insert analytics events" ON public.analytics_events
  FOR INSERT TO authenticated, anon WITH CHECK (true);

DROP POLICY IF EXISTS "Admins read analytics" ON public.analytics_events;
CREATE POLICY "Admins read analytics" ON public.analytics_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

GRANT INSERT ON public.analytics_events TO authenticated, anon;
GRANT SELECT ON public.analytics_events TO authenticated;

-- =====================================================================
-- 2. DISPUTES (Function 8) — add internal_comment & dispute_reason to deals
-- =====================================================================

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS internal_comment TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS dispute_reason TEXT DEFAULT '';

-- =====================================================================
-- 3. SEED DATA HELPER FUNCTION (admin can set realistic data)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.admin_set_creator_data(
  p_creator_id UUID,
  p_completed_deals INTEGER DEFAULT NULL,
  p_complaints_count INTEGER DEFAULT NULL,
  p_audience_quality TEXT DEFAULT NULL,
  p_audience_gender TEXT DEFAULT NULL,
  p_audience_age TEXT DEFAULT NULL,
  p_audience_cities TEXT DEFAULT NULL,
  p_follower_count INTEGER DEFAULT NULL,
  p_follower_range TEXT DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles
  SET
    completed_deals = COALESCE(p_completed_deals, completed_deals),
    complaints_count = COALESCE(p_complaints_count, complaints_count),
    audience_quality = COALESCE(p_audience_quality, audience_quality),
    audience_gender = COALESCE(p_audience_gender, audience_gender),
    audience_age = COALESCE(p_audience_age, audience_age),
    audience_cities = COALESCE(p_audience_cities, audience_cities),
    follower_count = COALESCE(p_follower_count, follower_count),
    follower_range = COALESCE(p_follower_range, follower_range)
  WHERE id = p_creator_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_creator_data TO authenticated;
