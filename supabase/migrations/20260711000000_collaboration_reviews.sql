-- Migration: Add collaboration_id to review tables for collaboration-based reviews

-- 1. Add collaboration_id to creator_reviews
ALTER TABLE creator_reviews ADD COLUMN IF NOT EXISTS collaboration_id UUID REFERENCES collaborations(id) ON DELETE CASCADE;

-- 2. Add collaboration_id to brand_reviews
ALTER TABLE brand_reviews ADD COLUMN IF NOT EXISTS collaboration_id UUID REFERENCES collaborations(id) ON DELETE CASCADE;

-- 3. Index for faster lookup
CREATE INDEX IF NOT EXISTS idx_creator_reviews_collaboration ON creator_reviews(collaboration_id);
CREATE INDEX IF NOT EXISTS idx_brand_reviews_collaboration ON brand_reviews(collaboration_id);

-- 4. Unique constraint: one review per collaboration per reviewer
DROP INDEX IF EXISTS idx_unique_creator_review_per_collab;
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_creator_review_per_collab ON creator_reviews(collaboration_id, reviewer_id) WHERE collaboration_id IS NOT NULL;

DROP INDEX IF EXISTS idx_unique_brand_review_per_collab;
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_brand_review_per_collab ON brand_reviews(collaboration_id, reviewer_id) WHERE collaboration_id IS NOT NULL;

-- 5. Update creator_reviews RLS to allow reading own + collaboration-related reviews
DROP POLICY IF EXISTS "Anyone can read approved creator reviews" ON creator_reviews;
CREATE POLICY "Anyone can read approved creator reviews"
  ON creator_reviews FOR SELECT
  USING (moderation_status = 'approved' OR reviewer_id = auth.uid() OR creator_id = auth.uid());

-- 6. Grant permissions
GRANT SELECT, INSERT, UPDATE ON creator_reviews TO authenticated;
GRANT SELECT, INSERT, UPDATE ON brand_reviews TO authenticated;
GRANT ALL ON creator_reviews TO service_role;
GRANT ALL ON brand_reviews TO service_role;
