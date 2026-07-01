-- =====================================================================
-- Seed Data — Collabrandly marketplace
-- Run this entire script in Supabase SQL Editor
-- All seed users have password: password123
-- =====================================================================

-- Ensure all needed columns exist in profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS instagram_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS tiktok_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS website text DEFAULT '',
  ADD COLUMN IF NOT EXISTS industry text DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone text DEFAULT '',
  ADD COLUMN IF NOT EXISTS social_platform text DEFAULT '',
  ADD COLUMN IF NOT EXISTS social_link text DEFAULT '',
  ADD COLUMN IF NOT EXISTS brand_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_person text DEFAULT '',
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'active'
    CHECK (verification_status IN ('active', 'pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS rejection_reason text DEFAULT '',
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'en';

-- Temporarily disable triggers so we can insert cleanly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_profile_create_subscription ON public.profiles;
DROP TRIGGER IF EXISTS on_profile_create_creator_info ON public.profiles;
DROP TRIGGER IF EXISTS on_profile_create_brand_info ON public.profiles;
DROP TRIGGER IF EXISTS on_profile_create_shopper_info ON public.profiles;

-- =====================================================================
-- 1. USERS (auth.users)
-- =====================================================================

-- Helper: insert a user and return the ID
DO $$
DECLARE
  uid UUID;
BEGIN

-- Creator 1 — Aruzhan (Beauty, Almaty)
uid := gen_random_uuid();
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous)
VALUES (uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'aruzhan@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"role":"creator","display_name":"Aruzhan"}', now(), now(), false, false);
INSERT INTO public.profiles (id, role, display_name, verification_status, bio, avatar_url, category, city, follower_range, instagram_url, tiktok_url, social_platform, social_link, phone, onboarded, locale)
VALUES (uid, 'creator', 'Aruzhan', 'approved',
  'Beauty and lifestyle creator from Almaty. I love sharing makeup tutorials, skincare routines, and everyday style inspiration.',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
  'beauty', 'Almaty', '50K-200K',
  'https://instagram.com/aruzhan.beauty',
  'https://tiktok.com/@aruzhan.beauty',
  'Instagram', 'https://instagram.com/aruzhan.beauty',
  '+7 701 123 45 67', true, 'ru');

-- Creator 2 — Damir (Fashion, Astana)
uid := gen_random_uuid();
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous)
VALUES (uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'damir@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"role":"creator","display_name":"Damir"}', now(), now(), false, false);
INSERT INTO public.profiles (id, role, display_name, verification_status, bio, avatar_url, category, city, follower_range, instagram_url, tiktok_url, social_platform, social_link, phone, onboarded, locale)
VALUES (uid, 'creator', 'Damir', 'approved',
  'Men''s fashion and streetwear. I review the latest drops and style minimal fits for the modern Kazakh guy.',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
  'fashion', 'Astana', '10K-50K',
  'https://instagram.com/damir.style',
  'https://tiktok.com/@damir.style',
  'Instagram', 'https://instagram.com/damir.style',
  '+7 702 234 56 78', true, 'ru');

-- Creator 3 — Alina (Fitness, Almaty)
uid := gen_random_uuid();
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous)
VALUES (uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'alina@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"role":"creator","display_name":"Alina"}', now(), now(), false, false);
INSERT INTO public.profiles (id, role, display_name, verification_status, bio, avatar_url, category, city, follower_range, instagram_url, tiktok_url, social_platform, social_link, phone, onboarded, locale)
VALUES (uid, 'creator', 'Alina', 'approved',
  'Fitness coach and nutrition enthusiast. Workout programs, healthy recipes, and motivation to keep you moving.',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
  'fitness', 'Almaty', '50K-200K',
  'https://instagram.com/alina.fit',
  'https://tiktok.com/@alina.fit',
  'Instagram', 'https://instagram.com/alina.fit',
  '+7 701 345 67 89', true, 'en');

-- Creator 4 — Ruslan (Tech, Astana)
uid := gen_random_uuid();
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous)
VALUES (uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ruslan@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"role":"creator","display_name":"Ruslan"}', now(), now(), false, false);
INSERT INTO public.profiles (id, role, display_name, verification_status, bio, avatar_url, category, city, follower_range, instagram_url, tiktok_url, social_platform, social_link, phone, onboarded, locale)
VALUES (uid, 'creator', 'Ruslan', 'approved',
  'Tech reviewer and gadget enthusiast. Unboxings, reviews, and tutorials on the latest smartphones, laptops, and smart home devices.',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
  'tech', 'Astana', '10K-50K',
  'https://instagram.com/ruslan.tech',
  'https://tiktok.com/@ruslan.tech',
  'YouTube', 'https://youtube.com/@ruslan.tech',
  '+7 702 456 78 90', true, 'ru');

-- Creator 5 — Aisha (Food, Almaty)
uid := gen_random_uuid();
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous)
VALUES (uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'aisha@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"role":"creator","display_name":"Aisha"}', now(), now(), false, false);
INSERT INTO public.profiles (id, role, display_name, verification_status, bio, avatar_url, category, city, follower_range, instagram_url, tiktok_url, social_platform, social_link, phone, onboarded, locale)
VALUES (uid, 'creator', 'Aisha', 'approved',
  'Food blogger sharing traditional Kazakh recipes with a modern twist. Also reviews restaurants in Almaty and Astana.',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop',
  'food', 'Almaty', '10K-50K',
  'https://instagram.com/aisha.eats',
  'https://tiktok.com/@aisha.eats',
  'Instagram', 'https://instagram.com/aisha.eats',
  '+7 701 567 89 01', true, 'kk');

-- Creator 6 — Timur (Lifestyle, Shymkent)
uid := gen_random_uuid();
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous)
VALUES (uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'timur@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"role":"creator","display_name":"Timur"}', now(), now(), false, false);
INSERT INTO public.profiles (id, role, display_name, verification_status, bio, avatar_url, category, city, follower_range, instagram_url, tiktok_url, social_platform, social_link, phone, onboarded, locale)
VALUES (uid, 'creator', 'Timur', 'approved',
  'Travel and lifestyle vlogger. Exploring Kazakhstan and sharing tips on travel, photography, and city life.',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
  'lifestyle', 'Shymkent', '1K-10K',
  'https://instagram.com/timur.life',
  'https://tiktok.com/@timur.life',
  'Instagram', 'https://instagram.com/timur.life',
  '+7 702 678 90 12', true, 'ru');

-- Brand 1 — Silk & Snow (Cosmetics brand)
uid := gen_random_uuid();
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous)
VALUES (uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'hello@silkandsnow.kz', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"role":"brand","display_name":"Silk & Snow"}', now(), now(), false, false);
INSERT INTO public.profiles (id, role, display_name, verification_status, bio, avatar_url, brand_name, contact_person, website, industry, city, phone, onboarded, locale)
VALUES (uid, 'brand', 'Silk & Snow', 'approved',
  'Kazakhstan''s premium natural cosmetics brand. Handcrafted soaps, serums, and skincare using local ingredients.',
  'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop',
  'Silk & Snow', 'Aigerim S.', 'https://silkandsnow.kz', 'Beauty & Cosmetics', 'Almaty', '+7 701 111 22 33', true, 'ru');

-- Brand 2 — Nomad Outdoors (Outdoor gear)
uid := gen_random_uuid();
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous)
VALUES (uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'info@nomadoutdoors.kz', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"role":"brand","display_name":"Nomad Outdoors"}', now(), now(), false, false);
INSERT INTO public.profiles (id, role, display_name, verification_status, bio, avatar_url, brand_name, contact_person, website, industry, city, phone, onboarded, locale)
VALUES (uid, 'brand', 'Nomad Outdoors', 'approved',
  'Outdoor equipment and camping gear for Kazakhstan''s adventurers. Tents, backpacks, and hiking accessories.',
  'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop',
  'Nomad Outdoors', 'Bekzat K.', 'https://nomadoutdoors.kz', 'Sports & Outdoors', 'Astana', '+7 702 222 33 44', true, 'ru');

END $$;

-- =====================================================================
-- 1b. CREATOR INFO, BRAND INFO, SHOPPER INFO
-- =====================================================================
DO $$
DECLARE
  creator_aruzhan UUID;
  creator_damir UUID;
  creator_alina UUID;
  creator_ruslan UUID;
  creator_aisha UUID;
  creator_timur UUID;
  brand_silk UUID;
  brand_nomad UUID;
BEGIN
  SELECT id INTO creator_aruzhan FROM public.profiles WHERE display_name = 'Aruzhan' AND role = 'creator' LIMIT 1;
  SELECT id INTO creator_damir   FROM public.profiles WHERE display_name = 'Damir' AND role = 'creator' LIMIT 1;
  SELECT id INTO creator_alina   FROM public.profiles WHERE display_name = 'Alina' AND role = 'creator' LIMIT 1;
  SELECT id INTO creator_ruslan  FROM public.profiles WHERE display_name = 'Ruslan' AND role = 'creator' LIMIT 1;
  SELECT id INTO creator_aisha   FROM public.profiles WHERE display_name = 'Aisha' AND role = 'creator' LIMIT 1;
  SELECT id INTO creator_timur   FROM public.profiles WHERE display_name = 'Timur' AND role = 'creator' LIMIT 1;
  SELECT id INTO brand_silk      FROM public.profiles WHERE display_name = 'Silk & Snow' AND role = 'brand' LIMIT 1;
  SELECT id INTO brand_nomad     FROM public.profiles WHERE display_name = 'Nomad Outdoors' AND role = 'brand' LIMIT 1;

  INSERT INTO public.creator_info (user_id, instagram_url, tiktok_url, youtube_url, other_social_links, content_category, bio, audience_size, creator_status, profile_completion_pct)
  VALUES
    (creator_aruzhan, 'https://instagram.com/aruzhan.beauty', 'https://tiktok.com/@aruzhan.beauty', '', '[]', 'beauty', 'Beauty and lifestyle creator from Almaty.', '50K-200K', 'active', 100),
    (creator_damir, 'https://instagram.com/damir.style', 'https://tiktok.com/@damir.style', '', '[]', 'fashion', 'Mens fashion and streetwear.', '10K-50K', 'active', 100),
    (creator_alina, 'https://instagram.com/alina.fit', 'https://tiktok.com/@alina.fit', '', '[]', 'fitness', 'Fitness coach and nutrition enthusiast.', '50K-200K', 'active', 100),
    (creator_ruslan, 'https://instagram.com/ruslan.tech', 'https://tiktok.com/@ruslan.tech', 'https://youtube.com/@ruslan.tech', '[]', 'tech', 'Tech reviewer and gadget enthusiast.', '10K-50K', 'active', 100),
    (creator_aisha, 'https://instagram.com/aisha.eats', 'https://tiktok.com/@aisha.eats', '', '[]', 'food', 'Food blogger sharing Kazakh recipes.', '10K-50K', 'active', 100),
    (creator_timur, 'https://instagram.com/timur.life', 'https://tiktok.com/@timur.life', '', '[]', 'lifestyle', 'Travel and lifestyle vlogger.', '1K-10K', 'active', 100);

  INSERT INTO public.brand_info (user_id, company_name, company_logo, business_email, phone, website, industry, company_description, company_size, company_country, verification_status)
  VALUES
    (brand_silk, 'Silk & Snow', 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop', 'hello@silkandsnow.kz', '+7 701 111 22 33', 'https://silkandsnow.kz', 'Beauty & Cosmetics', 'Kazakhstans premium natural cosmetics brand.', '10-50', 'Kazakhstan', 'approved'),
    (brand_nomad, 'Nomad Outdoors', 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop', 'info@nomadoutdoors.kz', '+7 702 222 33 44', 'https://nomadoutdoors.kz', 'Sports & Outdoors', 'Outdoor equipment and camping gear.', '10-50', 'Kazakhstan', 'approved');
END $$;

-- =====================================================================
-- 2. COLLECTIONS & PRODUCTS
-- =====================================================================

DO $$
DECLARE
  cid UUID;
  creator_aruzhan UUID;
  creator_damir UUID;
  creator_alina UUID;
  creator_ruslan UUID;
  creator_aisha UUID;
  creator_timur UUID;
BEGIN

  -- Fetch creator IDs
  SELECT id INTO creator_aruzhan FROM public.profiles WHERE display_name = 'Aruzhan' AND role = 'creator' LIMIT 1;
  SELECT id INTO creator_damir   FROM public.profiles WHERE display_name = 'Damir' AND role = 'creator' LIMIT 1;
  SELECT id INTO creator_alina   FROM public.profiles WHERE display_name = 'Alina' AND role = 'creator' LIMIT 1;
  SELECT id INTO creator_ruslan  FROM public.profiles WHERE display_name = 'Ruslan' AND role = 'creator' LIMIT 1;
  SELECT id INTO creator_aisha   FROM public.profiles WHERE display_name = 'Aisha' AND role = 'creator' LIMIT 1;
  SELECT id INTO creator_timur   FROM public.profiles WHERE display_name = 'Timur' AND role = 'creator' LIMIT 1;

  -- ================================================================
  -- Aruzhan — Beauty Collection
  -- ================================================================
  cid := gen_random_uuid();
  INSERT INTO public.collections (id, creator_id, title, description, cover_url, created_at)
  VALUES (cid, creator_aruzhan, 'Everyday Glam', 'My go-to makeup products for a natural everyday look. Perfect for work, dates, or brunch.', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&h=400&fit=crop', now());
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_aruzhan, 'Rose Gold Palette', 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400&h=400&fit=crop', 'https://example.com/palette', 0);
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_aruzhan, 'Luminous Foundation', 'https://images.unsplash.com/photo-1631214524020-7e18db9a8f92?w=400&h=400&fit=crop', 'https://example.com/foundation', 1);
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_aruzhan, 'Setting Spray', 'https://images.unsplash.com/photo-1631730359723-0f7e4e4f1b3b?w=400&h=400&fit=crop', 'https://example.com/setting-spray', 2);
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_aruzhan, 'Lip Gloss Set', 'https://images.unsplash.com/photo-1583241800698-e8ab01830a07?w=400&h=400&fit=crop', 'https://example.com/lip-gloss', 3);

  cid := gen_random_uuid();
  INSERT INTO public.collections (id, creator_id, title, description, cover_url, created_at)
  VALUES (cid, creator_aruzhan, 'Skincare Essentials', 'My top picks for healthy, glowing skin. All products I personally use and love.', 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&h=400&fit=crop', now());
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_aruzhan, 'Vitamin C Serum', 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=400&fit=crop', 'https://example.com/vitamin-c', 0);
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_aruzhan, 'Hyaluronic Acid', 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=400&h=400&fit=crop', 'https://example.com/hyaluronic', 1);
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_aruzhan, 'Night Cream', 'https://images.unsplash.com/photo-1570194065650-d99fb4b38a34?w=400&h=400&fit=crop', 'https://example.com/night-cream', 2);

  -- ================================================================
  -- Damir — Fashion Collection
  -- ================================================================
  cid := gen_random_uuid();
  INSERT INTO public.collections (id, creator_id, title, description, cover_url, created_at)
  VALUES (cid, creator_damir, 'Minimal Streetwear', 'Clean, minimal fits for the modern man. Neutral tones and quality fabrics.', 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=600&h=400&fit=crop', now());
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_damir, 'Oversized Hoodie', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop', 'https://example.com/hoodie', 0);
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_damir, 'Cargo Pants', 'https://images.unsplash.com/photo-1593032458808-99f290e0b9b8?w=400&h=400&fit=crop', 'https://example.com/cargo', 1);
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_damir, 'Sneakers', 'https://images.unsplash.com/photo-1597045566677-8cf032ed8434?w=400&h=400&fit=crop', 'https://example.com/sneakers', 2);
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_damir, 'Crossbody Bag', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop', 'https://example.com/bag', 3);

  cid := gen_random_uuid();
  INSERT INTO public.collections (id, creator_id, title, description, cover_url, created_at)
  VALUES (cid, creator_damir, 'Winter Layers', 'Stay warm and stylish this winter. Layering pieces that actually look good.', 'https://images.unsplash.com/photo-1544923246-77307dd270b5?w=600&h=400&fit=crop', now());
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_damir, 'Wool Coat', 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=400&fit=crop', 'https://example.com/coat', 0);
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_damir, 'Turtleneck', 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=400&fit=crop', 'https://example.com/turtleneck', 1);
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_damir, 'Leather Boots', 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=400&h=400&fit=crop', 'https://example.com/boots', 2);

  -- ================================================================
  -- Alina — Fitness Collection
  -- ================================================================
  cid := gen_random_uuid();
  INSERT INTO public.collections (id, creator_id, title, description, cover_url, created_at)
  VALUES (cid, creator_alina, 'Home Gym Setup', 'Everything you need to build an effective home gym without breaking the bank.', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&h=400&fit=crop', now());
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_alina, 'Yoga Mat', 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop', 'https://example.com/yoga-mat', 0);
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_alina, 'Resistance Bands', 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=400&h=400&fit=crop', 'https://example.com/bands', 1);
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_alina, 'Dumbbell Set', 'https://images.unsplash.com/photo-1638536532686-d610adfc8e5c?w=400&h=400&fit=crop', 'https://example.com/dumbbells', 2);

  cid := gen_random_uuid();
  INSERT INTO public.collections (id, creator_id, title, description, cover_url, created_at)
  VALUES (cid, creator_alina, 'Activewear Favorites', 'Comfortable and stylish activewear for your workouts. Tested and approved.', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=400&fit=crop', now());
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_alina, 'Leggings', 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=400&h=400&fit=crop', 'https://example.com/leggings', 0);
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_alina, 'Sports Bra', 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&h=400&fit=crop', 'https://example.com/sports-bra', 1);
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_alina, 'Running Shoes', 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&h=400&fit=crop', 'https://example.com/running-shoes', 2);

  -- ================================================================
  -- Ruslan — Tech Collection
  -- ================================================================
  cid := gen_random_uuid();
  INSERT INTO public.collections (id, creator_id, title, description, cover_url, created_at)
  VALUES (cid, creator_ruslan, 'Tech Essentials 2026', 'My top tech picks for productivity and entertainment this year.', 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=600&h=400&fit=crop', now());
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_ruslan, 'Wireless Earbuds', 'https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=400&h=400&fit=crop', 'https://example.com/earbuds', 0);
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_ruslan, 'Mechanical Keyboard', 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&h=400&fit=crop', 'https://example.com/keyboard', 1);
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_ruslan, 'Ultrawide Monitor', 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&h=400&fit=crop', 'https://example.com/monitor', 2);
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_ruslan, 'USB-C Hub', 'https://images.unsplash.com/photo-1617692855027-33b14d0613f8?w=400&h=400&fit=crop', 'https://example.com/usb-hub', 3);

  cid := gen_random_uuid();
  INSERT INTO public.collections (id, creator_id, title, description, cover_url, created_at)
  VALUES (cid, creator_ruslan, 'Smart Home Starter', 'Begin your smart home journey with these affordable and reliable devices.', 'https://images.unsplash.com/photo-1558002038-1055e2dae1d7?w=600&h=400&fit=crop', now());
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_ruslan, 'Smart Speaker', 'https://images.unsplash.com/photo-1589492477829-5e65395b66cc?w=400&h=400&fit=crop', 'https://example.com/speaker', 0);
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_ruslan, 'Smart Bulbs', 'https://images.unsplash.com/photo-1563316352-5a0e4e9b9b0f?w=400&h=400&fit=crop', 'https://example.com/bulbs', 1);
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_ruslan, 'Security Camera', 'https://images.unsplash.com/photo-1557310717-d6bea9f36682?w=400&h=400&fit=crop', 'https://example.com/camera', 2);

  -- ================================================================
  -- Aisha — Food Collection
  -- ================================================================
  cid := gen_random_uuid();
  INSERT INTO public.collections (id, creator_id, title, description, cover_url, created_at)
  VALUES (cid, creator_aisha, 'Modern Kazakh Cuisine', 'Traditional Kazakh dishes with a contemporary twist. Easy recipes for home cooks.', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop', now());
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_aisha, 'Beshbarmak Plate', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=400&fit=crop', 'https://example.com/beshbarmak', 0);
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_aisha, 'Manti Dumplings', 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=400&fit=crop', 'https://example.com/manti', 1);
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_aisha, 'Kazy Sausage', 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400&h=400&fit=crop', 'https://example.com/kazy', 2);

  cid := gen_random_uuid();
  INSERT INTO public.collections (id, creator_id, title, description, cover_url, created_at)
  VALUES (cid, creator_aisha, 'Almaty Cafe Guide', 'My favorite cafes in Almaty for coffee, brunch, and Instagrammable interiors.', 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&h=400&fit=crop', now());
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_aisha, 'Flat White', 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=400&fit=crop', 'https://example.com/flat-white', 0);
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_aisha, 'Avocado Toast', 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=400&h=400&fit=crop', 'https://example.com/avocado-toast', 1);
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_aisha, 'Berry Pancakes', 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=400&fit=crop', 'https://example.com/pancakes', 2);

  -- ================================================================
  -- Timur — Lifestyle Collection
  -- ================================================================
  cid := gen_random_uuid();
  INSERT INTO public.collections (id, creator_id, title, description, cover_url, created_at)
  VALUES (cid, creator_timur, 'Travel Kazakhstan', 'Hidden gems and must-visit places across Kazakhstan. Your ultimate travel guide.', 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&h=400&fit=crop', now());
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_timur, 'Charyn Canyon', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop', 'https://example.com/charyn', 0);
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_timur, 'Kolsai Lakes', 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&h=400&fit=crop', 'https://example.com/kolsai', 1);
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_timur, 'Almaty Nightlife', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=400&fit=crop', 'https://example.com/nightlife', 2);
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_timur, 'Mountain Hiking', 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=400&fit=crop', 'https://example.com/hiking', 3);

  cid := gen_random_uuid();
  INSERT INTO public.collections (id, creator_id, title, description, cover_url, created_at)
  VALUES (cid, creator_timur, 'Photography Gear', 'The camera equipment I use for travel photography and vlogging.', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&h=400&fit=crop', now());
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_timur, 'Mirrorless Camera', 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=400&fit=crop', 'https://example.com/camera', 0);
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_timur, 'Tripod', 'https://images.unsplash.com/photo-1585247226801-bc61344160e0?w=400&h=400&fit=crop', 'https://example.com/tripod', 1);
  INSERT INTO public.products (collection_id, creator_id, name, image_url, external_link, position) VALUES (cid, creator_timur, 'Drone', 'https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?w=400&h=400&fit=crop', 'https://example.com/drone', 2);

END $$;

-- =====================================================================
-- 3. RE-CREATE TRIGGERS (if they were previously dropped)
-- =====================================================================

-- Re-create the auth user trigger (simplified version)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Re-create the subscription trigger (fixed version with search_path = public)
CREATE TRIGGER on_profile_create_subscription
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_subscription();

-- Re-create role-specific info triggers
CREATE TRIGGER on_profile_create_creator_info
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.role = 'creator')
  EXECUTE FUNCTION public.handle_new_creator_info();

CREATE TRIGGER on_profile_create_brand_info
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.role = 'brand')
  EXECUTE FUNCTION public.handle_new_brand_info();

CREATE TRIGGER on_profile_create_shopper_info
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.role = 'shopper')
  EXECUTE FUNCTION public.handle_new_shopper_info();

-- =====================================================================
-- Done!
-- =====================================================================
