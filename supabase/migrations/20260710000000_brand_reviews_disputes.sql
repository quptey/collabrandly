-- Migration: brand_reviews table, dispute resolution enhancements

-- 1. brand_reviews table for creators reviewing brands
CREATE TABLE IF NOT EXISTS brand_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT DEFAULT '',
  status TEXT DEFAULT 'completed',
  moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE brand_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read approved brand reviews"
  ON brand_reviews FOR SELECT
  USING (moderation_status = 'approved');

CREATE POLICY "Users can insert brand reviews"
  ON brand_reviews FOR INSERT
  WITH CHECK (reviewer_id = auth.uid());

CREATE POLICY "Users can view own brand reviews"
  ON brand_reviews FOR SELECT
  USING (reviewer_id = auth.uid() OR brand_id = auth.uid());

-- 2. Add dispute tracking columns to deals
ALTER TABLE deals ADD COLUMN IF NOT EXISTS dispute_opened_by UUID REFERENCES auth.users(id);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS dispute_resolution TEXT DEFAULT '';
ALTER TABLE deals ADD COLUMN IF NOT EXISTS dispute_resolved_by UUID REFERENCES auth.users(id);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS dispute_resolved_at TIMESTAMPTZ;

-- 3. Add total_reviews to profiles (for both brands and creators)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- 4. RLS for deals to allow admin to update
DROP POLICY IF EXISTS "Admin can update deals" ON deals;
CREATE POLICY "Admin can update deals"
  ON deals FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 5. Function: update brand reputation
CREATE OR REPLACE FUNCTION update_brand_reputation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.moderation_status = 'approved' THEN
    UPDATE profiles SET
      total_reviews = (SELECT COUNT(*) FROM brand_reviews WHERE brand_id = NEW.brand_id AND moderation_status = 'approved'),
      average_rating = COALESCE(
        (SELECT ROUND(AVG(rating)::numeric, 2) FROM brand_reviews WHERE brand_id = NEW.brand_id AND moderation_status = 'approved'),
        0
      )
    WHERE id = NEW.brand_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_brand_reputation_trigger ON brand_reviews;
CREATE TRIGGER update_brand_reputation_trigger
  AFTER INSERT OR UPDATE OF moderation_status ON brand_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_brand_reputation();

-- 6. Update creator reputation function to also set total_reviews
CREATE OR REPLACE FUNCTION update_creator_reputation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.moderation_status = 'approved' THEN
    UPDATE profiles SET
      completed_deals = (SELECT COUNT(*) FROM creator_reviews WHERE creator_id = NEW.creator_id AND status = 'completed'),
      total_reviews = (SELECT COUNT(*) FROM creator_reviews WHERE creator_id = NEW.creator_id AND moderation_status = 'approved'),
      average_rating = COALESCE(
        (SELECT ROUND(AVG(rating)::numeric, 2) FROM creator_reviews WHERE creator_id = NEW.creator_id AND moderation_status = 'approved'),
        0
      )
    WHERE id = NEW.creator_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function: resolve dispute
CREATE OR REPLACE FUNCTION resolve_dispute(
  p_deal_id UUID,
  p_resolution TEXT,
  p_admin_id UUID
)
RETURNS void AS $$
DECLARE
  v_creator_id UUID;
  v_brand_id UUID;
BEGIN
  SELECT creator_id, brand_id INTO v_creator_id, v_brand_id
  FROM deals WHERE id = p_deal_id;

  UPDATE deals SET
    status = 'completed',
    dispute_resolution = p_resolution,
    dispute_resolved_by = p_admin_id,
    dispute_resolved_at = now()
  WHERE id = p_deal_id;

  -- If brand wins, increment complaints_count on creator
  IF p_resolution = 'brand_wins' THEN
    UPDATE profiles SET
      complaints_count = COALESCE(complaints_count, 0) + 1
    WHERE id = v_creator_id;
  END IF;

  -- If creator wins, no change to reputation
  -- If resolved_without_penalty, no change
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
