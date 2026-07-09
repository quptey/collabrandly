-- Final MVP Polish: reviews, chat attachments, and dispute improvements

-- =====================================================================
-- 1. Add rating & comment to creator_reviews
-- =====================================================================
ALTER TABLE public.creator_reviews
  ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  ADD COLUMN IF NOT EXISTS comment TEXT DEFAULT '';

-- =====================================================================
-- 2. Add average_rating to profiles
-- =====================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0;

-- =====================================================================
-- 3. Add attachment columns to messages
-- =====================================================================
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS attachment_type TEXT DEFAULT ''
    CHECK (attachment_type IN ('image', 'video', 'pdf', 'link', ''));

-- =====================================================================
-- 4. Update trigger to update average_rating on review insert
-- =====================================================================
CREATE OR REPLACE FUNCTION public.update_creator_reputation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'completed' THEN
      NEW.moderation_status := 'approved';
      UPDATE public.profiles SET completed_deals = completed_deals + 1 WHERE id = NEW.creator_id;
      -- Recalculate average rating
      UPDATE public.profiles SET average_rating = (
        SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0)
        FROM public.creator_reviews
        WHERE creator_id = NEW.creator_id AND rating IS NOT NULL AND moderation_status = 'approved'
      ) WHERE id = NEW.creator_id;
    ELSIF NEW.status = 'failed' THEN
      NEW.moderation_status := 'pending';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Also recalc average_rating when admin approves/rejects complaints
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
    UPDATE public.profiles SET average_rating = (
      SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0)
      FROM public.creator_reviews
      WHERE creator_id = v_creator_id AND rating IS NOT NULL AND moderation_status = 'approved'
    ) WHERE id = v_creator_id;
  END IF;
END;
$$;

-- =====================================================================
-- 5. Storage bucket for chat attachments
-- =====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat_attachments', 'chat_attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY IF NOT EXISTS "Anyone can view chat attachments"
  ON storage.objects FOR SELECT USING (bucket_id = 'chat_attachments');

CREATE POLICY IF NOT EXISTS "Authenticated users can upload chat attachments"
  ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'chat_attachments' AND auth.role() = 'authenticated'
  );

CREATE POLICY IF NOT EXISTS "Users can delete own chat attachments"
  ON storage.objects FOR DELETE USING (
    bucket_id = 'chat_attachments' AND auth.uid() = owner
  );
