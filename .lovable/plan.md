
The MVP already has: profiles, collections, products, brand_requests, auth, onboarding, a marketplace index, creator public page, and a creator dashboard. This plan extends it into the full SaaS you described while reusing what works.

## Scope

### 1. Database extensions (one migration)
- Add `admin` to `user_role` enum; create `user_roles` table + `has_role()` security-definer function (RBAC, no role on profiles).
- New tables: `saved_creators` (brand_id, creator_id), `notifications` (user_id, type, title, body, link, read_at), `campaigns` (brand_id, title, brief, budget_range, status) — campaigns scaffolded for future use.
- Extend `brand_requests` with `status` enum (pending/accepted/rejected) + UPDATE policy so creators can change status on their own requests.
- Extend `profiles` with `instagram_url`, `tiktok_url`, `approved` boolean (admin approval flag).
- Triggers: auto-create notification when a brand_request is inserted (to creator) or status changes (to brand).
- Future-proof empty tables (created but unused in UI yet): `affiliate_links`, `link_clicks`, `coupons`, `messages` — minimal columns, RLS on, ready to wire later.
- GRANTs + RLS on every new table.

### 2. i18n (EN / RU / KK)
- Add `i18next` + `react-i18next` + `i18next-browser-languagedetector`.
- `src/i18n/index.ts` initializes with `en` default, locales persisted in `localStorage` (`lng`) and synced to `profiles.locale` when signed in.
- Translation files: `src/i18n/locales/{en,ru,kk}.json` organized by namespace (`common`, `nav`, `landing`, `dashboard`, `marketplace`, `auth`, `forms`, `notifications`).
- Language switcher (globe icon dropdown) in `SiteHeader`.
- Refactor existing hardcoded strings in header, index, auth, onboarding, dashboard, creator page, dialogs to `t()` keys.
- Add `profiles.locale` column in the migration.

### 3. Landing page (`/`)
Currently `/` is the marketplace. Move marketplace to `/marketplace` and make `/` a true landing page:
- Hero: "Where creators and brands collaborate beautifully." + Get Started / Explore Creators CTAs, subtle parallax/fade-in via framer-motion.
- Features grid, How it works (3 steps), Creator benefits, Brand benefits, Testimonials carousel, Pricing (Free / Pro / Brand tiers — display only), FAQ accordion, Footer with locale switcher + links.
- All copy via i18n keys.
- Marketplace UI from current `index.tsx` is moved verbatim to `src/routes/marketplace.tsx`.

### 4. Creator Dashboard (extend existing `/dashboard`)
Tabs: Overview (metrics: collections, products, requests, profile views placeholder), Profile, Collections (existing), Products (flat list across collections, quick edit), Brand Requests (with Accept/Reject buttons updating status, triggering notifications), Notifications, Analytics (placeholder cards labeled "Coming soon" — scaffolded).

### 5. Brand Dashboard (`/brand`)
- Saved Creators (grid, unsave action).
- Requests history (status badges, filter by status).
- Campaigns (list + create modal — saves to `campaigns` table; "Coming soon" badge on the workflow features).
- Browse shortcut → `/marketplace`.

### 6. Admin Dashboard (`/admin`)
- Gated by `_authenticated` + `has_role(uid, 'admin')` server fn check in component (redirect if not admin).
- Tabs: Overview (metric cards + simple bar chart of signups by week using `recharts`), Users (list with role, approve/delete), Creators, Brands, Collections, Products, Requests.
- Approve creator toggles `profiles.approved`; only approved creators show in `/marketplace`.

### 7. Marketplace (`/marketplace`)
- Keep existing filter logic.
- Add "Save creator" heart icon on each card (writes to `saved_creators`, requires brand auth — shows sign-in CTA otherwise).
- Show Instagram/TikTok icons.

### 8. Creator Profile (`/creator/$id`)
- Polish into "mini personal website": hero cover, social links row, collections grid, contact button. Already mostly there — add socials and a richer hero.

### 9. Notifications
- Bell icon in header with unread badge (live via `supabase.channel` realtime subscription on `notifications` table for current user).
- Dropdown list, mark-as-read on click, link to target.

### 10. Design tokens
- Keep existing warm palette but align with requested values: bg `#FAF8F6`, card `#FFFFFF`, ink `#111827`, muted `#6B7280`, accent `#D97757`.
- Switch heading font from Fraunces to Inter as requested (single-family premium feel with weight contrast). Dark mode tokens included.

### 11. Scalable architecture hooks (no UI, schema + types only)
Stub tables for affiliate_links, link_clicks, coupons, messages enable future feature work without another migration cycle.

## Tech notes

- Routes added: `marketplace.tsx`, `brand.tsx` (brand dashboard, gated under `_authenticated`), `admin.tsx`, `notifications` integrated into header.
- New deps: `i18next`, `react-i18next`, `i18next-browser-languagedetector`, `recharts`, `framer-motion`.
- Admin gating uses an `is-admin` server fn calling `has_role`; brand-only actions check `profile.role === 'brand'` client-side + RLS server-side.
- Realtime notifications via supabase channels in a `NotificationsBell` component.
- All new UI text uses `t('namespace.key')`; lint check: no raw user-facing strings in new components.

## Out of scope (scaffolded but not wired)
Affiliate tracking, Stripe payments, email/SMS sending, messaging UI, commission/revenue dashboards, performance analytics charts beyond signup counts. Schema and routes hint at them; implementation is future work.

## Order of execution
1. Migration (await approval).
2. Install deps + i18n setup + translations.
3. Token refresh in `styles.css`, switch fonts to Inter.
4. Move marketplace → `/marketplace`, build landing at `/`.
5. NotificationsBell + header language switcher.
6. Extend Creator dashboard (Overview, Products tab, Request status actions).
7. Brand dashboard route.
8. Admin dashboard route + `is-admin` server fn.
9. Marketplace Save-creator + social icons.
10. Polish creator profile.

This is large — expect several turns. Approve to start with the migration.
