-- Add tables needed for full Brand Dashboard functionality

-- 1. Profile views tracking
CREATE TABLE IF NOT EXISTS public.profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_views_viewed ON public.profile_views(viewed_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewer ON public.profile_views(viewer_id);

ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert profile views"
  ON public.profile_views FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view own profile views"
  ON public.profile_views FOR SELECT
  TO authenticated
  USING (auth.uid() = viewed_id);

-- 2. Campaign applications (creators apply to brand campaigns)
CREATE TABLE IF NOT EXISTS public.campaign_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, creator_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_applications_campaign ON public.campaign_applications(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_applications_creator ON public.campaign_applications(creator_id);

ALTER TABLE public.campaign_applications ENABLE ROW LEVEL SECURITY;

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

-- 3. Storage bucket for images
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'images');

CREATE POLICY "Authenticated upload access"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'images');

CREATE POLICY "Owners update their uploads"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'images' AND owner = auth.uid());

CREATE POLICY "Owners delete their uploads"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'images' AND owner = auth.uid());

-- 4. Add cover_url to profiles for brand cover images
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS cover_url TEXT DEFAULT '';

-- 5. Add INSERT policy for applications table (needed for onboarding flow)
DROP POLICY IF EXISTS "Users can insert own applications" ON public.applications;
CREATE POLICY "Users can insert own applications"
  ON public.applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 6. Add INSERT policies for notifications
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
CREATE POLICY "Users can insert own notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can insert notifications for any user"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
