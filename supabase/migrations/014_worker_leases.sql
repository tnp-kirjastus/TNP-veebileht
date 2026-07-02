-- Atomic worker leases and bounded exponential retries.
CREATE OR REPLACE FUNCTION smaily.claim_retries(p_worker_id UUID, p_batch_size INTEGER DEFAULT 20)
RETURNS SETOF smaily.retry_queue
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog AS $$
  WITH claimed AS (
    SELECT id FROM smaily.retry_queue
    WHERE completed_at IS NULL AND dead_lettered_at IS NULL
      AND available_at <= now() AND (leased_until IS NULL OR leased_until < now())
    ORDER BY available_at, created_at
    FOR UPDATE SKIP LOCKED LIMIT least(greatest(p_batch_size, 1), 100)
  )
  UPDATE smaily.retry_queue q
  SET lease_id = p_worker_id, leased_until = now() + interval '2 minutes'
  FROM claimed c WHERE q.id = c.id RETURNING q.*;
$$;

CREATE OR REPLACE FUNCTION smaily.complete_retry(p_id UUID, p_lease_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog AS $$
  WITH done AS (
    UPDATE smaily.retry_queue SET completed_at = now(), lease_id = NULL, leased_until = NULL
    WHERE id = p_id AND lease_id = p_lease_id AND completed_at IS NULL RETURNING 1
  ) SELECT EXISTS(SELECT 1 FROM done);
$$;

CREATE OR REPLACE FUNCTION smaily.fail_retry(p_id UUID, p_lease_id UUID, p_error_code TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE v_attempts INTEGER;
BEGIN
  UPDATE smaily.retry_queue SET attempts = attempts + 1,
    last_error_code = left(p_error_code, 120), lease_id = NULL, leased_until = NULL
  WHERE id = p_id AND lease_id = p_lease_id AND completed_at IS NULL
  RETURNING attempts INTO v_attempts;
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_attempts >= 8 THEN
    UPDATE smaily.retry_queue SET dead_lettered_at = now() WHERE id = p_id;
  ELSE
    UPDATE smaily.retry_queue
    SET available_at = now() + make_interval(secs => least(21600, 30 * power(2, v_attempts)::integer))
    WHERE id = p_id;
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION commerce.fail_outbox(p_id UUID, p_lease_id UUID, p_error_code TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE v_attempts INTEGER;
BEGIN
  UPDATE commerce.outbox SET attempts = attempts + 1,
    error_code = left(p_error_code, 120), lease_id = NULL, leased_until = NULL
  WHERE id = p_id AND lease_id = p_lease_id AND processed_at IS NULL
  RETURNING attempts INTO v_attempts;
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_attempts >= 8 THEN
    UPDATE commerce.outbox SET dead_lettered_at = now() WHERE id = p_id;
  ELSE
    UPDATE commerce.outbox
    SET available_at = now() + make_interval(secs => least(21600, 30 * power(2, v_attempts)::integer))
    WHERE id = p_id;
  END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION smaily.claim_retries(UUID,INTEGER), smaily.complete_retry(UUID,UUID),
  smaily.fail_retry(UUID,UUID,TEXT), commerce.fail_outbox(UUID,UUID,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION smaily.claim_retries(UUID,INTEGER), smaily.complete_retry(UUID,UUID),
  smaily.fail_retry(UUID,UUID,TEXT), commerce.fail_outbox(UUID,UUID,TEXT) TO service_role;
