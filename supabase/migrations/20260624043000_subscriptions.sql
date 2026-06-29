-- Create subscription_plans table
CREATE TABLE subscription_plans (
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

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Everyone can read plans
CREATE POLICY "Anyone can read subscription plans"
  ON subscription_plans FOR SELECT
  USING (true);

-- Create subscriptions table
CREATE TABLE subscriptions (
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

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
CREATE POLICY "Users can read own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Insert seed plans
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
   3);

-- Auto-create subscription for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_plan_id UUID;
BEGIN
  -- Determine plan based on role
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

-- Trigger on profile insert
DROP TRIGGER IF EXISTS on_profile_create_subscription ON public.profiles;
CREATE TRIGGER on_profile_create_subscription
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_subscription();

-- Grant execute
REVOKE EXECUTE ON FUNCTION public.handle_new_user_subscription() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user_subscription() TO authenticated;

-- Grant access to subscriptions for the service role and authenticated user
REVOKE ALL ON subscription_plans FROM anon;
REVOKE ALL ON subscriptions FROM anon;
GRANT SELECT ON subscription_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE ON subscriptions TO authenticated;
