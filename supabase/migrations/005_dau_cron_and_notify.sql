-- Migration 005: DAU counting + Phase 1 validation gate notification
-- pg_cron counts daily active users → if DAU >= 10, sends email via pg_net + Resend

-- Enable required extensions (Supabase Pro plan)
-- If on free plan, use the /api/cron/dau endpoint instead
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 1. Function: count distinct users who created captures today, upsert into analytics.dau
CREATE OR REPLACE FUNCTION analytics.count_dau()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT user_id)
  INTO _count
  FROM public.captures
  WHERE created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day'
    AND user_id IS NOT NULL;

  INSERT INTO analytics.dau (date, distinct_users)
  VALUES (CURRENT_DATE, _count)
  ON CONFLICT (date)
  DO UPDATE SET distinct_users = EXCLUDED.distinct_users;
END;
$$;

-- 2. Function: check DAU threshold and send Resend email if first time reaching 10
CREATE OR REPLACE FUNCTION analytics.notify_dau_milestone()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _dau INTEGER;
  _already_notified BOOLEAN;
  _owner_email TEXT;
  _resend_key TEXT;
BEGIN
  -- Get today's DAU
  SELECT distinct_users INTO _dau
  FROM analytics.dau
  WHERE date = CURRENT_DATE;

  IF _dau IS NULL OR _dau < 10 THEN
    RETURN;
  END IF;

  -- Check if already notified for any date
  SELECT EXISTS(
    SELECT 1 FROM analytics.dau WHERE notified_at IS NOT NULL
  ) INTO _already_notified;

  IF _already_notified THEN
    RETURN;
  END IF;

  -- Get config
  SELECT value INTO _owner_email FROM app_config WHERE key = 'owner_email';
  SELECT value INTO _resend_key FROM app_config WHERE key = 'resend_api_key';

  IF _owner_email IS NULL OR _resend_key IS NULL THEN
    RAISE WARNING 'DAU milestone reached (%) but owner_email or resend_api_key not configured', _dau;
    RETURN;
  END IF;

  -- Send email via Resend using pg_net
  PERFORM net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || _resend_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', 'CapSave <noreply@capsave.app>',
      'to', ARRAY[_owner_email],
      'subject', '🎉 CapSave Phase 1 Validated — DAU ' || _dau || ' reached!',
      'html', '<h2>Phase 1 Validation Gate Passed</h2>'
        || '<p>CapSave has reached <strong>' || _dau || ' daily active users</strong> today (' || CURRENT_DATE || ').</p>'
        || '<p>Time to move to Phase 2 growth features.</p>'
    )
  );

  -- Mark as notified
  UPDATE analytics.dau
  SET notified_at = now()
  WHERE date = CURRENT_DATE;
END;
$$;

-- 3. Helper functions callable from JS client (public schema wrappers)

-- Check if any DAU milestone was already notified
CREATE OR REPLACE FUNCTION public.check_dau_notified()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS(SELECT 1 FROM analytics.dau WHERE notified_at IS NOT NULL);
$$;

-- Mark today's DAU as notified
CREATE OR REPLACE FUNCTION public.mark_dau_notified()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE analytics.dau SET notified_at = now() WHERE date = CURRENT_DATE;
$$;

-- 4. Schedule: run daily at 23:55 KST (14:55 UTC)
-- Note: pg_cron requires Supabase Pro plan. On free plan, use Vercel Cron instead.
SELECT cron.schedule(
  'capsave-dau-count',
  '55 14 * * *',
  $$SELECT analytics.count_dau(); SELECT analytics.notify_dau_milestone();$$
);
