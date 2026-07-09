-- MVP Final: complaint moderation, payment flow, notifications improvements

-- =====================================================================
-- 1. COMPLAINT MODERATION for creator_reviews
-- =====================================================================

ALTER TABLE public.creator_reviews
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (moderation_status IN ('pending', 'approved', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_creator_reviews_moderation ON public.creator_reviews(moderation_status);

-- Replace the old trigger function: auto-approve completed, hold failed for moderation
CREATE OR REPLACE FUNCTION public.update_creator_reputation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'completed' THEN
      NEW.moderation_status := 'approved';
      UPDATE public.profiles SET completed_deals = completed_deals + 1 WHERE id = NEW.creator_id;
    ELSIF NEW.status = 'failed' THEN
      NEW.moderation_status := 'pending';
      -- complaints_count NOT incremented until admin approves
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Admin approve complaint: set approved + increment complaints_count
CREATE OR REPLACE FUNCTION public.approve_complaint(p_review_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_creator_id UUID;
BEGIN
  UPDATE public.creator_reviews
  SET moderation_status = 'approved'
  WHERE id = p_review_id AND moderation_status = 'pending' AND status = 'failed'
  RETURNING creator_id INTO v_creator_id;

  IF v_creator_id IS NOT NULL THEN
    UPDATE public.profiles SET complaints_count = complaints_count + 1 WHERE id = v_creator_id;
  END IF;
END;
$$;

-- Admin reject complaint: set rejected, do nothing else
CREATE OR REPLACE FUNCTION public.reject_complaint(p_review_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.creator_reviews
  SET moderation_status = 'rejected'
  WHERE id = p_review_id AND moderation_status = 'pending' AND status = 'failed';
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_complaint TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_complaint TO authenticated;

-- =====================================================================
-- 2. DEAL NOTIFICATIONS — add notification types for deal events
-- No schema changes needed; notifications table already exists
-- =====================================================================

-- =====================================================================
-- 3. PAYMENT — add payment verification flag to report_requests
-- =====================================================================

ALTER TABLE public.report_requests
  ADD COLUMN IF NOT EXISTS payment_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payer_phone TEXT DEFAULT '';

-- =====================================================================
-- 4. GRANT execute on admin_set_creator_data to service_role too
-- =====================================================================

GRANT EXECUTE ON FUNCTION public.admin_set_creator_data TO service_role;
