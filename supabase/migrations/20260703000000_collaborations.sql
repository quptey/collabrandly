-- =====================================================================
-- Collaborations table — auto-created when campaign application accepted
-- Tracks the full lifecycle of a brand-creator collaboration
-- Idempotent (safe to run multiple times)
-- =====================================================================

-- ============================================================
-- 1. Create collaboration_status enum
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.collaboration_status AS ENUM (
    'accepted', 'in_progress', 'content_submitted', 'under_review', 'completed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. Create collaborations table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.collaborations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_application_id UUID NOT NULL UNIQUE REFERENCES public.campaign_applications(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.collaboration_status NOT NULL DEFAULT 'accepted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_collaborations_brand ON public.collaborations(brand_id);
CREATE INDEX IF NOT EXISTS idx_collaborations_creator ON public.collaborations(creator_id);
CREATE INDEX IF NOT EXISTS idx_collaborations_campaign ON public.collaborations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_collaborations_status ON public.collaborations(status);

-- ============================================================
-- 4. Auto-update updated_at via existing set_updated_at trigger
-- ============================================================
DROP TRIGGER IF EXISTS collaborations_updated ON public.collaborations;
CREATE TRIGGER collaborations_updated
  BEFORE UPDATE ON public.collaborations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 5. RLS
-- ============================================================
ALTER TABLE public.collaborations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "collaborations_select_participant" ON public.collaborations;
CREATE POLICY "collaborations_select_participant" ON public.collaborations
  FOR SELECT TO authenticated
  USING (brand_id = auth.uid() OR creator_id = auth.uid());

DROP POLICY IF EXISTS "collaborations_update_participant" ON public.collaborations;
CREATE POLICY "collaborations_update_participant" ON public.collaborations
  FOR UPDATE TO authenticated
  USING (brand_id = auth.uid() OR creator_id = auth.uid())
  WITH CHECK (brand_id = auth.uid() OR creator_id = auth.uid());

-- ============================================================
-- 6. Trigger: auto-create collaboration when application accepted
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_collaboration_on_accept()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_brand_id uuid;
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status <> 'accepted') THEN
    SELECT brand_id INTO v_brand_id FROM public.campaigns WHERE id = NEW.campaign_id;
    INSERT INTO public.collaborations (campaign_application_id, campaign_id, brand_id, creator_id)
    VALUES (NEW.id, NEW.campaign_id, v_brand_id, NEW.creator_id)
    ON CONFLICT (campaign_application_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trigger_create_collaboration ON public.campaign_applications;
CREATE TRIGGER trigger_create_collaboration
  AFTER UPDATE OF status ON public.campaign_applications
  FOR EACH ROW EXECUTE FUNCTION public.create_collaboration_on_accept();

-- ============================================================
-- 7. Update notify_on_application_status to notify both parties
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_on_application_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_campaign_title text;
  v_brand_name text;
  v_creator_name text;
BEGIN
  IF NEW.status IN ('accepted', 'rejected') AND (OLD.status IS NULL OR OLD.status <> NEW.status) THEN
    SELECT title INTO v_campaign_title FROM public.campaigns WHERE id = NEW.campaign_id;

    IF NEW.status = 'accepted' THEN
      SELECT display_name INTO v_brand_name FROM public.profiles WHERE id IN (SELECT brand_id FROM public.campaigns WHERE id = NEW.campaign_id);
      SELECT display_name INTO v_creator_name FROM public.profiles WHERE id = NEW.creator_id;

      -- Notify creator
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (
        NEW.creator_id, 'campaign_accepted',
        'Сотрудничество начато!',
        'Бренд "' || COALESCE(v_brand_name, 'Бренд') || '" принял ваш отклик на "' || v_campaign_title || '". Переходите к сотрудничеству.',
        '/creator?page=collaborations'
      );

      -- Notify brand
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (
        (SELECT brand_id FROM public.campaigns WHERE id = NEW.campaign_id), 'collaboration_started',
        'Сотрудничество начато!',
        'Вы начали сотрудничество с "' || COALESCE(v_creator_name, 'Креатор') || '" по кампании "' || v_campaign_title || '".',
        '/brand'
      );
    ELSE
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (
        NEW.creator_id, 'campaign_rejected',
        'Заявка отклонена',
        'Ваш отклик на "' || v_campaign_title || '" отклонён.',
        '/campaigns'
      );
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- ============================================================
-- 8. Grants
-- ============================================================
GRANT SELECT, INSERT, UPDATE ON public.collaborations TO authenticated;
