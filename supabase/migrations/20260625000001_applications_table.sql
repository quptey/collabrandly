-- =====================================================================
-- Applications table — MVP application review system
-- Fields match spec exactly
-- =====================================================================

DROP TABLE IF EXISTS public.applications CASCADE;

CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('creator', 'brand')),
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  social_link TEXT NOT NULL DEFAULT '',
  company_name TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_role ON public.applications(role);
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON public.applications(user_id);

-- RLS
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Users can view their own application
DROP POLICY IF EXISTS "Users read own application" ON public.applications;
CREATE POLICY "Users read own application" ON public.applications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all applications
DROP POLICY IF EXISTS "Admins read all applications" ON public.applications;
CREATE POLICY "Admins read all applications" ON public.applications
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update applications (approve/reject)
DROP POLICY IF EXISTS "Admins update applications" ON public.applications;
CREATE POLICY "Admins update applications" ON public.applications
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Service role can do everything
DROP POLICY IF EXISTS "Service role manages applications" ON public.applications;
CREATE POLICY "Service role manages applications" ON public.applications
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON public.applications TO authenticated;
GRANT UPDATE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
