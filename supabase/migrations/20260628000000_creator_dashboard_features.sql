-- Creator Dashboard: portfolio photos, languages, view counters

-- 1. Portfolio photos table
CREATE TABLE IF NOT EXISTS public.portfolio_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT DEFAULT '',
  position INT NOT NULL DEFAULT 0,
  is_cover BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_photos_creator ON public.portfolio_photos(creator_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_photos_position ON public.portfolio_photos(creator_id, position);

ALTER TABLE public.portfolio_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators manage own portfolio photos"
  ON public.portfolio_photos FOR ALL
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Public can view portfolio photos"
  ON public.portfolio_photos FOR SELECT
  TO public
  USING (true);

-- 2. Add languages column to profiles for creator language selection
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS languages JSONB DEFAULT '[]'::jsonb;

-- 3. Creator analytics / view counters table
CREATE TABLE IF NOT EXISTS public.creator_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storefront_views INT NOT NULL DEFAULT 0,
  portfolio_views INT NOT NULL DEFAULT 0,
  total_saves INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(creator_id)
);

CREATE INDEX IF NOT EXISTS idx_creator_stats_creator ON public.creator_stats(creator_id);

ALTER TABLE public.creator_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creator can manage own stats"
  ON public.creator_stats FOR ALL
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Public can view creator stats"
  ON public.creator_stats FOR SELECT
  TO public
  USING (true);

-- 4. Storage bucket for portfolio images
INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolio', 'portfolio', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read portfolio" ON storage.objects;
CREATE POLICY "Public read portfolio"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'portfolio');

DROP POLICY IF EXISTS "Authenticated upload portfolio" ON storage.objects;
CREATE POLICY "Authenticated upload portfolio"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'portfolio');

DROP POLICY IF EXISTS "Owners update portfolio" ON storage.objects;
CREATE POLICY "Owners update portfolio"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'portfolio' AND owner = auth.uid());

DROP POLICY IF EXISTS "Owners delete portfolio" ON storage.objects;
CREATE POLICY "Owners delete portfolio"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'portfolio' AND owner = auth.uid());

-- 5. Function to auto-increment storefront/portfolio views
CREATE OR REPLACE FUNCTION public.increment_creator_stat(p_creator_id UUID, p_stat TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.creator_stats (creator_id, storefront_views, portfolio_views, total_saves)
  VALUES (p_creator_id,
    CASE WHEN p_stat = 'storefront' THEN 1 ELSE 0 END,
    CASE WHEN p_stat = 'portfolio' THEN 1 ELSE 0 END,
    0
  )
  ON CONFLICT (creator_id) DO UPDATE SET
    storefront_views = CASE WHEN p_stat = 'storefront' THEN public.creator_stats.storefront_views + 1 ELSE public.creator_stats.storefront_views END,
    portfolio_views = CASE WHEN p_stat = 'portfolio' THEN public.creator_stats.portfolio_views + 1 ELSE public.creator_stats.portfolio_views END,
    updated_at = now();
END;
$$;
