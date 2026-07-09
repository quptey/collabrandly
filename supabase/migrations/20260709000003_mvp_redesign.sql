-- MVP Redesign: simplified deal flow, chat per deal, new statuses

-- 1. Add title to deals (project name)
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';

-- 2. Update status check constraint to include 'rejected'
ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_status_check;
ALTER TABLE public.deals ADD CONSTRAINT deals_status_check
  CHECK (status IN ('pending', 'confirmed', 'completed', 'dispute', 'rejected'));

-- 3. Add deal_id to messages for chat-per-deal
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_messages_deal ON public.messages(deal_id);

-- 4. Add creator_dispute_available flag — set to true when 7 days past deadline without completion
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS creator_dispute_available BOOLEAN NOT NULL DEFAULT false;

-- 5. Update trigger for brand_confirmed initially true
CREATE OR REPLACE FUNCTION public.check_deal_confirmation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.brand_confirmed AND NEW.creator_confirmed AND OLD.status = 'pending' THEN
    NEW.status = 'confirmed';
  END IF;
  RETURN NEW;
END;
$$;

-- 6. Function to auto-mark creator_dispute_available when deadline is past
CREATE OR REPLACE FUNCTION public.check_dispute_eligibility()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'confirmed' AND NEW.deadline IS NOT NULL AND NEW.deadline < NOW() - INTERVAL '7 days' THEN
    NEW.creator_dispute_available = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_deal_check_dispute
  BEFORE UPDATE ON public.deals
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed' AND OLD.status = 'confirmed')
  EXECUTE FUNCTION public.check_dispute_eligibility();

-- 7. Function to get deals with participant profiles (used by deal page)
CREATE OR REPLACE FUNCTION public.get_deal_with_participants(p_deal_id UUID)
RETURNS TABLE(
  deal_id UUID,
  title TEXT,
  amount TEXT,
  description TEXT,
  deadline TIMESTAMPTZ,
  status TEXT,
  brand_id UUID,
  creator_id UUID,
  brand_confirmed BOOLEAN,
  creator_confirmed BOOLEAN,
  dispute_reason TEXT,
  internal_comment TEXT,
  creator_dispute_available BOOLEAN,
  created_at TIMESTAMPTZ,
  brand_name TEXT,
  brand_avatar TEXT,
  creator_name TEXT,
  creator_avatar TEXT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id AS deal_id,
    d.title,
    d.amount,
    d.description,
    d.deadline,
    d.status,
    d.brand_id,
    d.creator_id,
    d.brand_confirmed,
    d.creator_confirmed,
    d.dispute_reason,
    d.internal_comment,
    d.creator_dispute_available,
    d.created_at,
    bp.display_name AS brand_name,
    bp.avatar_url AS brand_avatar,
    cp.display_name AS creator_name,
    cp.avatar_url AS creator_avatar
  FROM public.deals d
  LEFT JOIN public.profiles bp ON bp.id = d.brand_id
  LEFT JOIN public.profiles cp ON cp.id = d.creator_id
  WHERE d.id = p_deal_id;
END;
$$;

-- 8. Grant execute on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.get_deal_with_participants TO authenticated;

-- 9. Update RLS to allow reading deal messages
CREATE POLICY "Participants read deal messages"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    deal_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.deals WHERE id = deal_id AND (brand_id = auth.uid() OR creator_id = auth.uid()))
  );

-- 9. Allow participants to insert deal messages
CREATE POLICY "Participants insert deal messages"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      (deal_id IS NULL AND recipient_id IS NOT NULL)
      OR
      (deal_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.deals WHERE id = deal_id AND (brand_id = auth.uid() OR creator_id = auth.uid())))
    )
  );
