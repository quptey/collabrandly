-- =====================================================================
-- Restore production RLS policies — rebuilds all policies from
-- the 12 migration files exactly as originally intended.
-- Safe to re-run (DROP IF EXISTS / CREATE OR REPLACE).
-- =====================================================================

-- ============================================================
-- 1. PROFILES
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are publicly viewable" ON public.profiles;

CREATE POLICY "Profiles are publicly viewable"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 2. COLLECTIONS
-- ============================================================
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Collections are publicly viewable" ON public.collections;
DROP POLICY IF EXISTS "Creators manage their own collections" ON public.collections;
DROP POLICY IF EXISTS "Admins can view all collections" ON public.collections;
DROP POLICY IF EXISTS "Admins can delete collections" ON public.collections;

CREATE POLICY "Collections are publicly viewable"
  ON public.collections FOR SELECT
  USING (true);

CREATE POLICY "Creators manage their own collections"
  ON public.collections FOR ALL
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Admins can view all collections"
  ON public.collections FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete collections"
  ON public.collections FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 3. PRODUCTS
-- ============================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Products are publicly viewable" ON public.products;
DROP POLICY IF EXISTS "Creators manage their own products" ON public.products;
DROP POLICY IF EXISTS "Admins can view all products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;

CREATE POLICY "Products are publicly viewable"
  ON public.products FOR SELECT
  USING (true);

CREATE POLICY "Creators manage their own products"
  ON public.products FOR ALL
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Admins can view all products"
  ON public.products FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete products"
  ON public.products FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 4. BRAND_REQUESTS
-- ============================================================
ALTER TABLE public.brand_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creator can view requests sent to them" ON public.brand_requests;
DROP POLICY IF EXISTS "Authenticated users can send requests" ON public.brand_requests;
DROP POLICY IF EXISTS "Creator can update request status" ON public.brand_requests;
DROP POLICY IF EXISTS "Admins can view all brand_requests" ON public.brand_requests;
DROP POLICY IF EXISTS "Admins can delete brand_requests" ON public.brand_requests;

CREATE POLICY "Creator can view requests sent to them"
  ON public.brand_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = creator_id OR auth.uid() = sender_id);

CREATE POLICY "Authenticated users can send requests"
  ON public.brand_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Creator can update request status"
  ON public.brand_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Admins can view all brand_requests"
  ON public.brand_requests FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete brand_requests"
  ON public.brand_requests FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 5. USER_ROLES
-- ============================================================
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own roles" ON public.user_roles;

CREATE POLICY "users read own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 6. SAVED_CREATORS
-- ============================================================
ALTER TABLE public.saved_creators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brand sees own saves" ON public.saved_creators;
DROP POLICY IF EXISTS "Brand creates own save" ON public.saved_creators;
DROP POLICY IF EXISTS "Brand deletes own save" ON public.saved_creators;

CREATE POLICY "Brand sees own saves"
  ON public.saved_creators FOR SELECT
  TO authenticated
  USING (auth.uid() = brand_id);

CREATE POLICY "Brand creates own save"
  ON public.saved_creators FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = brand_id);

CREATE POLICY "Brand deletes own save"
  ON public.saved_creators FOR DELETE
  TO authenticated
  USING (auth.uid() = brand_id);

-- ============================================================
-- 7. NOTIFICATIONS
-- ============================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User reads own notifications" ON public.notifications;
DROP POLICY IF EXISTS "User updates own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can insert notifications for any user" ON public.notifications;

CREATE POLICY "User reads own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "User updates own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can insert notifications for any user"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- ============================================================
-- 8. CAMPAIGNS
-- ============================================================
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brand manages own campaigns" ON public.campaigns;

CREATE POLICY "Brand manages own campaigns"
  ON public.campaigns FOR ALL
  TO authenticated
  USING (auth.uid() = brand_id)
  WITH CHECK (auth.uid() = brand_id);

-- ============================================================
-- 9. AFFILIATE_LINKS
-- ============================================================
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creator manages own affiliate links" ON public.affiliate_links;

CREATE POLICY "Creator manages own affiliate links"
  ON public.affiliate_links FOR ALL
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- ============================================================
-- 10. LINK_CLICKS
-- ============================================================
ALTER TABLE public.link_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creator reads own link clicks" ON public.link_clicks;

CREATE POLICY "Creator reads own link clicks"
  ON public.link_clicks FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.affiliate_links a WHERE a.id = affiliate_link_id AND a.creator_id = auth.uid()));

-- ============================================================
-- 11. COUPONS
-- ============================================================
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brand manages own coupons" ON public.coupons;

CREATE POLICY "Brand manages own coupons"
  ON public.coupons FOR ALL
  TO authenticated
  USING (auth.uid() = brand_id)
  WITH CHECK (auth.uid() = brand_id);

-- ============================================================
-- 12. MESSAGES
-- ============================================================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants read messages" ON public.messages;
DROP POLICY IF EXISTS "Sender writes messages" ON public.messages;
DROP POLICY IF EXISTS "Recipient marks read" ON public.messages;

CREATE POLICY "Participants read messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Sender writes messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipient marks read"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- ============================================================
-- 13. APPLICATIONS (onboarding flow)
-- ============================================================
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own application" ON public.applications;
DROP POLICY IF EXISTS "Admins read all applications" ON public.applications;
DROP POLICY IF EXISTS "Admins update applications" ON public.applications;
DROP POLICY IF EXISTS "Service role manages applications" ON public.applications;
DROP POLICY IF EXISTS "Users can insert own applications" ON public.applications;

CREATE POLICY "Users read own application"
  ON public.applications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own applications"
  ON public.applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read all applications"
  ON public.applications FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update applications"
  ON public.applications FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages applications"
  ON public.applications FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 14. CREATOR_INFO
-- ============================================================
ALTER TABLE public.creator_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own creator_info" ON public.creator_info;
DROP POLICY IF EXISTS "Users insert own creator_info" ON public.creator_info;
DROP POLICY IF EXISTS "Users update own creator_info" ON public.creator_info;
DROP POLICY IF EXISTS "Admins view all creator_info" ON public.creator_info;
DROP POLICY IF EXISTS "Admins update creator_info" ON public.creator_info;
DROP POLICY IF EXISTS "Service role manages creator_info" ON public.creator_info;

CREATE POLICY "Users view own creator_info"
  ON public.creator_info FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own creator_info"
  ON public.creator_info FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own creator_info"
  ON public.creator_info FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all creator_info"
  ON public.creator_info FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update creator_info"
  ON public.creator_info FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages creator_info"
  ON public.creator_info FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 15. BRAND_INFO
-- ============================================================
ALTER TABLE public.brand_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own brand_info" ON public.brand_info;
DROP POLICY IF EXISTS "Users insert own brand_info" ON public.brand_info;
DROP POLICY IF EXISTS "Users update own brand_info" ON public.brand_info;
DROP POLICY IF EXISTS "Admins view all brand_info" ON public.brand_info;
DROP POLICY IF EXISTS "Admins update brand_info" ON public.brand_info;
DROP POLICY IF EXISTS "Service role manages brand_info" ON public.brand_info;

CREATE POLICY "Users view own brand_info"
  ON public.brand_info FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own brand_info"
  ON public.brand_info FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own brand_info"
  ON public.brand_info FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all brand_info"
  ON public.brand_info FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update brand_info"
  ON public.brand_info FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages brand_info"
  ON public.brand_info FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 16. SHOPPER_INFO
-- ============================================================
ALTER TABLE public.shopper_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own shopper_info" ON public.shopper_info;
DROP POLICY IF EXISTS "Users insert own shopper_info" ON public.shopper_info;
DROP POLICY IF EXISTS "Users update own shopper_info" ON public.shopper_info;
DROP POLICY IF EXISTS "Admins view all shopper_info" ON public.shopper_info;
DROP POLICY IF EXISTS "Service role manages shopper_info" ON public.shopper_info;

CREATE POLICY "Users view own shopper_info"
  ON public.shopper_info FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own shopper_info"
  ON public.shopper_info FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own shopper_info"
  ON public.shopper_info FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all shopper_info"
  ON public.shopper_info FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages shopper_info"
  ON public.shopper_info FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 17. PORTFOLIO_PHOTOS
-- ============================================================
ALTER TABLE public.portfolio_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators manage own portfolio photos" ON public.portfolio_photos;
DROP POLICY IF EXISTS "Public can view portfolio photos" ON public.portfolio_photos;

CREATE POLICY "Creators manage own portfolio photos"
  ON public.portfolio_photos FOR ALL
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Public can view portfolio photos"
  ON public.portfolio_photos FOR SELECT
  TO public
  USING (true);

-- ============================================================
-- 18. CREATOR_STATS
-- ============================================================
ALTER TABLE public.creator_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creator can manage own stats" ON public.creator_stats;
DROP POLICY IF EXISTS "Public can view creator stats" ON public.creator_stats;

CREATE POLICY "Creator can manage own stats"
  ON public.creator_stats FOR ALL
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Public can view creator stats"
  ON public.creator_stats FOR SELECT
  TO public
  USING (true);

-- ============================================================
-- 19. PROFILE_VIEWS
-- ============================================================
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert profile views" ON public.profile_views;
DROP POLICY IF EXISTS "Users can view own profile views" ON public.profile_views;

CREATE POLICY "Anyone can insert profile views"
  ON public.profile_views FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view own profile views"
  ON public.profile_views FOR SELECT
  TO authenticated
  USING (auth.uid() = viewed_id);

-- ============================================================
-- 20. CAMPAIGN_APPLICATIONS
-- ============================================================
ALTER TABLE public.campaign_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brands view applications to their campaigns" ON public.campaign_applications;
DROP POLICY IF EXISTS "Creators apply to campaigns" ON public.campaign_applications;
DROP POLICY IF EXISTS "Brands update application status" ON public.campaign_applications;

CREATE POLICY "Brands view applications to their campaigns"
  ON public.campaign_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND brand_id = auth.uid())
    OR auth.uid() = creator_id
  );

CREATE POLICY "Creators apply to campaigns"
  ON public.campaign_applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Brands update application status"
  ON public.campaign_applications FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND brand_id = auth.uid()));

-- ============================================================
-- 21. SUBSCRIPTION_PLANS
-- ============================================================
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read subscription plans" ON public.subscription_plans;

CREATE POLICY "Anyone can read subscription plans"
  ON public.subscription_plans FOR SELECT
  USING (true);

-- ============================================================
-- 22. SUBSCRIPTIONS
-- ============================================================
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own subscription" ON public.subscriptions;

CREATE POLICY "Users can read own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- Notify PostgREST to reload schema cache
-- ============================================================
NOTIFY pgrst, 'reload schema';
