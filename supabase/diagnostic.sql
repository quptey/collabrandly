-- ============================================================
-- PRODUCTION DIAGNOSTIC — run this in Supabase SQL Editor
-- ============================================================

-- 1. TABLES THAT EXIST
SELECT table_name, table_schema
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. ROW COUNTS FOR ALL TABLES
SELECT 'profiles' as tbl, count(*) FROM public.profiles
UNION ALL SELECT 'collections', count(*) FROM public.collections
UNION ALL SELECT 'products', count(*) FROM public.products
UNION ALL SELECT 'brand_requests', count(*) FROM public.brand_requests
UNION ALL SELECT 'messages', count(*) FROM public.messages
UNION ALL SELECT 'saved_creators', count(*) FROM public.saved_creators
UNION ALL SELECT 'notifications', count(*) FROM public.notifications
UNION ALL SELECT 'campaigns', count(*) FROM public.campaigns
UNION ALL SELECT 'subscriptions', count(*) FROM public.subscriptions
UNION ALL SELECT 'subscription_plans', count(*) FROM public.subscription_plans
UNION ALL SELECT 'applications', count(*) FROM public.applications
UNION ALL SELECT 'affiliate_links', count(*) FROM public.affiliate_links
UNION ALL SELECT 'user_roles', count(*) FROM public.user_roles
UNION ALL SELECT 'creator_info', count(*) FROM public.creator_info
UNION ALL SELECT 'brand_info', count(*) FROM public.brand_info
UNION ALL SELECT 'shopper_info', count(*) FROM public.shopper_info
UNION ALL SELECT 'coupons', count(*) FROM public.coupons
UNION ALL SELECT 'link_clicks', count(*) FROM public.link_clicks;

-- 3. AUTH USERS COUNT
SELECT 'auth.users' as tbl, count(*) FROM auth.users;

-- 4. STORAGE BUCKETS
SELECT id, name, public FROM storage.buckets;

-- 5. STORAGE OBJECTS PER BUCKET
SELECT bucket_id, count(*) FROM storage.objects GROUP BY bucket_id;

-- 6. PROFILES COLUMNS (check if new columns exist)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 7. RLS POLICIES ON PROFILES
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- 8. FK CONSTRAINTS ON BRAND_REQUESTS (check sender_id FK target)
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'brand_requests';

-- 9. FK CONSTRAINTS ON SAVED_CREATORS
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'saved_creators';

-- 10. FK CONSTRAINTS ON MESSAGES
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'messages';

-- 11. PROFILE RECORDS WITH THEIR AUTH USERS (check if any orphaned)
SELECT p.id, p.role, p.display_name, p.onboarded, p.verification_status,
       u.email
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.id
ORDER BY p.created_at DESC;

-- 12. CHECK IF SOCIAL COLUMNS EXIST (the ones my migration was supposed to add)
SELECT column_name,
  CASE WHEN column_name IN ('youtube_url','telegram_url','x_url','facebook_url','linkedin_url','social_links','cover_url','languages','engagement_rate')
       THEN 'NEW (mvp migration)'
       ELSE 'EXISTING'
  END as origin
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
  AND column_name IN ('instagram_url','tiktok_url','youtube_url','telegram_url','x_url','facebook_url','linkedin_url','social_links','cover_url','languages','engagement_rate','username','website','social_link','social_platform')
ORDER BY column_name;

-- 13. POSTGREST SCHEMA CACHE STATUS
SELECT * FROM pg_available_extensions WHERE name = 'pg_stat_statements';

-- 14. ANY RECENT MIGRATIONS APPLIED (if supabase_migrations.schema_migrations exists)
SELECT * FROM supabase_migrations.schema_migrations ORDER BY name;
