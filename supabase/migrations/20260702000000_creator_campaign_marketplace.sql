-- =====================================================================
-- Creator Campaign Marketplace Enhancements
-- engagement_rate on campaigns, 'viewed' status, notification trigger,
-- FK from campaigns.brand_id to profiles.id, creator notification
-- Idempotent (safe to run multiple times)
-- =====================================================================

-- ============================================================
-- 0. Add FK from campaigns.brand_id to profiles.id
-- Needed for reliable PostgREST joins in the client
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'campaigns_brand_id_fkey_profiles'
  ) THEN
    ALTER TABLE public.campaigns
      ADD CONSTRAINT campaigns_brand_id_fkey_profiles
      FOREIGN KEY (brand_id) REFERENCES public.profiles(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================
-- 1. Add engagement_rate and location columns to campaigns
-- ============================================================
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS engagement_rate text DEFAULT '';

-- ============================================================
-- 2. Add 'viewed' to campaign_applications CHECK constraint
-- Need to drop and recreate the constraint since ALTER CHECK isn't possible
-- ============================================================
ALTER TABLE public.campaign_applications DROP CONSTRAINT IF EXISTS campaign_applications_status_check;
ALTER TABLE public.campaign_applications ADD CONSTRAINT campaign_applications_status_check
  CHECK (status IN ('pending', 'viewed', 'accepted', 'rejected', 'withdrawn'));

-- Add portfolio column for creator applications
ALTER TABLE public.campaign_applications ADD COLUMN IF NOT EXISTS portfolio text DEFAULT '';

-- ============================================================
-- 3. Notification trigger when creator applies to a campaign
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_on_campaign_application()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_brand_id uuid;
  v_brand_name text;
  v_campaign_title text;
BEGIN
  SELECT brand_id, title INTO v_brand_id, v_campaign_title
  FROM public.campaigns WHERE id = NEW.campaign_id;

  SELECT display_name INTO v_brand_name
  FROM public.profiles WHERE id = v_brand_id;

  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    v_brand_id,
    'campaign_application',
    'Новый отклик на кампанию',
    'Креатор откликнулся на "' || v_campaign_title || '"',
    '/brand'
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS campaign_application_inserted ON public.campaign_applications;
CREATE TRIGGER campaign_application_inserted
  AFTER INSERT ON public.campaign_applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_campaign_application();

-- ============================================================
-- 4. Notification trigger when application status changes
-- Notifies the creator when their application is accepted or rejected
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_on_application_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_campaign_title text;
BEGIN
  IF NEW.status IN ('accepted', 'rejected') AND (OLD.status IS NULL OR OLD.status <> NEW.status) THEN
    SELECT title INTO v_campaign_title FROM public.campaigns WHERE id = NEW.campaign_id;
    IF NEW.status = 'accepted' THEN
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (
        NEW.creator_id, 'campaign_accepted',
        'Заявка принята',
        'Ваш отклик на "' || v_campaign_title || '" принят. Контакты бренда открыты.',
        '/campaigns'
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

DROP TRIGGER IF EXISTS campaign_application_status_changed ON public.campaign_applications;
CREATE TRIGGER campaign_application_status_changed
  AFTER UPDATE OF status ON public.campaign_applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_application_status();

-- ============================================================
-- 5. Function to count applicants per campaign (for display)
-- ============================================================
CREATE OR REPLACE FUNCTION public.count_campaign_applicants(campaign_id uuid)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count bigint;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.campaign_applications
  WHERE campaign_applications.campaign_id = count_campaign_applicants.campaign_id;
  RETURN v_count;
END $$;
