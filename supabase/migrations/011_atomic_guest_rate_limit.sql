-- Migration 011: Atomic guest rate limit consumption.
--
-- The web API must consume guest quota in one database operation. A separate
-- read followed by update can allow concurrent guest requests to exceed the
-- daily limit and can expose the counter table to direct anon writes.

ALTER TABLE public.guest_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.guest_rate_limits FROM anon;
REVOKE ALL ON public.guest_rate_limits FROM authenticated;

DROP FUNCTION IF EXISTS public.consume_guest_rate_limit(text, integer);

CREATE OR REPLACE FUNCTION public.consume_guest_rate_limit(
  p_ip_key text,
  p_max_requests integer,
  p_cost integer DEFAULT 1
)
RETURNS TABLE (
  allowed boolean,
  remaining integer,
  reset_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
BEGIN
  IF p_ip_key IS NULL OR length(trim(p_ip_key)) = 0 THEN
    RAISE EXCEPTION 'p_ip_key is required';
  END IF;

  IF p_max_requests < 1 THEN
    RAISE EXCEPTION 'p_max_requests must be positive';
  END IF;

  IF p_cost < 1 THEN
    RAISE EXCEPTION 'p_cost must be positive';
  END IF;

  INSERT INTO public.guest_rate_limits (ip_key, count, created_at, updated_at)
  VALUES (p_ip_key, 0, now(), now())
  ON CONFLICT (ip_key) DO NOTHING;

  SELECT count
  INTO current_count
  FROM public.guest_rate_limits
  WHERE ip_key = p_ip_key
  FOR UPDATE;

  IF current_count >= p_max_requests OR current_count + p_cost > p_max_requests THEN
    allowed := false;
  ELSE
    current_count := current_count + p_cost;
    allowed := true;

    UPDATE public.guest_rate_limits
    SET count = current_count,
        updated_at = now()
    WHERE ip_key = p_ip_key;
  END IF;

  remaining := greatest(p_max_requests - current_count, 0);
  reset_at := (
    date_trunc('day', now() AT TIME ZONE 'UTC')
    + interval '1 day'
    - interval '1 millisecond'
  ) AT TIME ZONE 'UTC';

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_guest_rate_limit(text, integer, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.consume_guest_rate_limit(text, integer, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.consume_guest_rate_limit(text, integer, integer) TO authenticated;
