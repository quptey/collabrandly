# Security Audit Report — Collabrandly

**Date:** 2026-06-30  
**Scope:** Full-stack security review of the Collabrandly application (React + Supabase)

---

## Category Summary

| # | Category | Status | Details |
|---|----------|--------|---------|
| 1 | Environment Variables | ✅ Passing | No hardcoded secrets; Vite build-time replacement for client, `process.env` for server |
| 2 | Hardcoded Secrets | ✅ Passing | No API keys, tokens, or secrets found in source code |
| 3 | XSS Prevention | ✅ Passing | No `dangerouslySetInnerHTML` usage found; React handles auto-escaping |
| 4 | SQL Injection | ✅ Passing | Supabase JS client uses parameterized queries; no raw SQL concatenation in client code |
| 5 | Input Validation | ⚠️ Needs Improvement | Zod schemas cover all forms; password minimum is 6 chars (low); no rate limiting on auth |
| 6 | RLS Policies | ⚠️ Needs Improvement | Several gaps identified (see §RLS) |
| 7 | Storage Security | ⚠️ Needs Improvement | Buckets are public; no MIME/size enforcement at policy level |
| 8 | Auth Flow | ✅ Passing | Session persistence, token refresh, middleware auth, all handled correctly |
| 9 | CASCADE Safety | ⚠️ Needs Improvement | Missing CASCADE on `subscriptions.plan_id`; indirect FK references |
| 10 | Function Permissions | ⚠️ Needs Improvement | Several `SECURITY DEFINER` functions had no `REVOKE` for authenticated users |

---

## Detailed Findings

### 1. Environment Variables — ✅ Passing

- **Client-side** (`src/integrations/supabase/client.ts`): Uses `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`. Vite replaces these at build time — safe.
- **Server-side** (`src/integrations/supabase/client.server.ts`): Uses `process.env.SUPABASE_URL` and `process.env.SUPABASE_SERVICE_ROLE_KEY`. Service role key is never exposed to the client bundle.
- **Auth middleware** (`src/integrations/supabase/auth-middleware.ts`): Uses `process.env` — safe.
- **`.env.example`** only contains placeholder values — no secrets committed.
- **`.env`** is in `.gitignore` — confirmed not tracked.

### 2. Hardcoded Secrets — ✅ Passing

Grep for `api_key`, `api_secret`, `secret_key`, `private_key` across `src/` returned zero results. The only "password" references are form data passed to Supabase auth methods (not stored in code).

### 3. Cross-Site Scripting (XSS) — ✅ Passing

Grep for `dangerouslySetInnerHTML` returned zero results across the entire project. React's default JSX escaping applies in all components.

### 4. SQL Injection — ✅ Passing

All database queries use the Supabase JS client's query builder `.select()`, `.insert()`, `.update()`, `.eq()`, etc. These are parameterized internally. No raw SQL strings are concatenated with user input in application code.

### 5. Input Validation — ⚠️ Needs Improvement

**Good:**
- All forms use Zod validation schemas (`src/lib/validation.ts`)
- Email format, URL format, required fields, password confirmation are validated
- Server-side Zod schemas exist before DB writes

**Issues:**
- **Password strength**: Minimum 6 characters (`z.string().min(6)`) is below OWASP recommendation (8+ chars with complexity). Consider raising to `min(8)` and adding character-type requirements.
- **No server-side rate limiting**: Auth endpoints (`supabase.auth.signUp`, `supabase.auth.signInWithPassword`) rely on Supabase's built-in rate limiting, but there is no application-level rate limiting for other mutation endpoints.
- **Role validation in `handle_new_user` trigger**: The previous implementation did a direct `CAST((NEW.raw_user_meta_data->>'role')::public.user_role)` which would fail the entire user creation trigger if an invalid role string was provided. Fixed in migration 20260630000000 to validate against a known list before casting.

### 6. RLS Policies — ⚠️ Needs Improvement

**Good:**
- Most tables have RLS enabled and appropriate policies
- `profiles`: Public SELECT; INSERT/UPDATE own profile; admin UPDATE/DELETE
- `collections`/`products`: Public SELECT; creator CRUD; admin CRUD
- `messages`: Participant-only SELECT; sender INSERT; recipient UPDATE
- `creator_info`/`brand_info`/`shopper_info`: User-owned access with admin override
- `notifications`: User-owned access
- `campaigns`: Brand manages own; no public SELECT (correct — campaigns are private)

**Issues:**
- **`campaign_applications`**: Was created in migration 20260627000000 with RLS, but lacked `withdrawn` status and creator-withdrawal policy. Fixed in 20260630000000.
- **`subscriptions` table**: RLS for SELECT exists (`auth.uid() = user_id`), but no INSERT/UPDATE policies for direct user access. The `handle_new_user_subscription` trigger uses `SECURITY DEFINER` to bypass RLS, so subscription creation works. However, there are no policies allowing users to UPDATE their own subscriptions (e.g., cancel). Grants exist but RLS blocks them. Consider adding `UPDATE` policy for users to manage their own subscriptions.
- **`campaigns` table**: No public/anon SELECT. Only brand can view their campaigns. Creators cannot browse/list campaigns unless they have an application or invitation. This may be intentional for a closed campaign model, but if public campaign discovery is needed, a filtered policy should be added.
- **`brand_requests.creator_id` FK**: Referenced `public.profiles(id)` instead of `auth.users(id)`. While this works (profiles.id → auth.users.id CASCADE), it is an indirect reference. Fixed in 20260630000000 to reference `auth.users(id)` directly.

### 7. Storage Security — ⚠️ Needs Improvement

**Good:**
- `images` bucket: Public read, authenticated upload, owner update/delete
- `portfolio` bucket: Public read, authenticated upload, owner update/delete
- DELETE policies check `owner = auth.uid()`

**Issues:**
- **No MIME type restriction**: The INSERT policies for both buckets do not restrict file types. Users can upload any file type (including HTML, SVG with script content, etc.). Add a `CHECK` on `storage.objects` for MIME type (e.g., only `image/*`).
- **No file size limit**: Storage bucket policies do not enforce file size limits. While Supabase has project-level limits, application-level enforcement is recommended.
- **`images` bucket INSERT policy**: Previously did not check `owner = auth.uid()`. Fixed in 20260630000000 to check owner equals current user.
- **`portfolio` bucket**: Same MIME/size policy gaps.

### 8. Auth Flow — ✅ Passing

- **Session management**: Uses `onAuthStateChange` listener and `getSession()` in `auth-context.tsx`. Session is persisted via `localStorage` with `autoRefreshToken: true` — standard and secure Supabase pattern.
- **Token validation**: Auth middleware (`src/integrations/supabase/auth-middleware.ts`) validates Bearer tokens correctly:
  - Checks header presence and `Bearer ` prefix
  - Validates 3-part JWT format (`token.split('.').length !== 3`)
  - Calls `supabase.auth.getUser(token)` to verify with Supabase
- **Client-side auth attachment**: `auth-attacher.ts` correctly attaches the Bearer token to server function RPCs.
- **Service role client** (`client.server.ts`): Only usable in server context. Has clear documentation warning against client-side use.
- **Password reset flow**: Route exists (`/auth/reset-password`) but not fully implemented in reviewed code.

### 9. CASCADE Safety — ⚠️ Needs Improvement

**Good:**
- Most tables have `ON DELETE CASCADE` for foreign keys to `auth.users(id)`
- `brand_requests.sender_id` correctly uses `ON DELETE SET NULL` (preserves request if sender is deleted)
- `profile_views.viewer_id` correctly uses `ON DELETE SET NULL`

**Issues:**
- **`subscriptions.plan_id`**: References `subscription_plans(id)` with **no ON DELETE action**. Deleting a subscription plan would fail if any subscriptions reference it. Migration 20260630000000 adds `ON DELETE RESTRICT` to prevent accidental deletion of in-use plans.
- **`applications.approved_by`**: References `auth.users(id)` with **no ON DELETE action**. If an admin user is deleted, the application record becomes orphaned. Migration 20260630000000 adds `ON DELETE SET NULL`.
- **Indirect FK references**: Several tables (`collections`, `products`, `brand_requests`) reference `profiles(id)` instead of `auth.users(id)`. Since `profiles.id` is itself a FK to `auth.users(id)` with CASCADE, the chain works correctly in practice, but it creates coupling between schema layers. Migration 20260630000000 fixes these to reference `auth.users(id)` directly.

### 10. Function Permissions — ⚠️ Needs Improvement

**Good:**
- The full-schema migration includes `REVOKE EXECUTE` blocks for internal trigger functions (`set_updated_at`, `handle_new_user`, etc.)
- `has_role` function is correctly granted to `authenticated` (needed by RLS policies)
- `update_last_login` is correctly revoked from public/anon

**Issues:**
- Several `SECURITY DEFINER` functions (which run with elevated privileges) did not have explicit `REVOKE` statements in all migration files:
  - `handle_new_creator_info`
  - `handle_new_brand_info`
  - `handle_new_shopper_info`
  - `handle_new_user_subscription`
  These are trigger functions and should not be callable directly by authenticated users. Fixed in 20260630000000.

### 11. Other Findings

- **`full-schema.sql` line 788**: `DROP TABLE IF EXISTS public.applications CASCADE;` — This destructive statement will **delete all application data** every time the combined schema is re-run. The table is then recreated, but data is lost. This is a **critical issue** for any environment where the full schema is re-applied. The table should use `CREATE TABLE IF NOT EXISTS` instead.
- **Mock Supabase client** (`client.ts` lines 57-90): Returns empty/null data for all operations without authentication. This is acceptable for development/demo mode but should be clearly documented as never reaching production.
- **`profile` typed as `any`** in `auth-context.tsx` line 27: Not a direct security issue, but type safety is weakened.

---

## Recommendations

### Immediate (Critical)
1. **Remove `DROP TABLE IF EXISTS public.applications CASCADE`** from `full-schema.sql` — replace with `CREATE TABLE IF NOT EXISTS`.
2. **Apply migration 20260630000000** to fix FK references, role validation, missing indexes, and permissions.

### Short-term (High)
3. **Add MIME type and size restrictions** to storage bucket INSERT policies:
   ```sql
   -- Run in Supabase SQL Editor (requires pg_net extension)
   ALTER TABLE storage.objects ADD CONSTRAINT images_mime_check
   CHECK (bucket_id != 'images' OR (bucket_id = 'images' AND (metadata->>'mimetype' LIKE 'image/%')));
   ```
4. **Raise password minimum** from 6 to 8 characters with complexity requirements in `src/lib/validation.ts`.
5. **Add RLS INSERT/UPDATE policies for `subscriptions`** table so users can manage their own subscriptions directly (not just via triggers).
6. **Ensure `campaigns` has appropriate SELECT policies** if creators need to discover/view campaigns.

### Long-term (Medium)
7. **Add application-level rate limiting** for all mutation endpoints.
8. **Consider audit logging** for sensitive operations (admin role changes, user deletions).
9. **Review storage file cleanup** — ensure files in `images` and `portfolio` buckets are cleaned up when related DB records are deleted.
10. **Add `COALESCE` or validation wrappers** for all `raw_user_meta_data->>'field'` casts in trigger functions.
