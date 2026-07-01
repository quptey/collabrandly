-- Add record_id column to notifications for smart navigation
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS record_id uuid DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_record_id ON public.notifications(record_id);
