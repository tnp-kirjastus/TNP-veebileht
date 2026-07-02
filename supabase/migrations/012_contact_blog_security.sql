CREATE OR REPLACE FUNCTION content.submit_contact_message(
  p_name TEXT,
  p_email TEXT,
  p_message TEXT,
  p_locale TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE v_id UUID;
BEGIN
  IF length(trim(p_name)) NOT BETWEEN 2 AND 120
     OR length(trim(p_email)) NOT BETWEEN 3 AND 320
     OR length(trim(p_message)) NOT BETWEEN 5 AND 5000
     OR p_locale NOT IN ('et','en') THEN
    RAISE EXCEPTION 'invalid_contact_message' USING ERRCODE = '22023';
  END IF;
  INSERT INTO content.contact_messages(name,email,message,locale)
  VALUES (trim(p_name), lower(trim(p_email)), trim(p_message), p_locale)
  RETURNING id INTO v_id;
  INSERT INTO commerce.outbox(event_type,payload)
  VALUES ('contact.received', jsonb_build_object('contact_message_id', v_id));
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION content.submit_contact_message(TEXT,TEXT,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION content.submit_contact_message(TEXT,TEXT,TEXT,TEXT) TO service_role;

-- Public posts expose only published rows. Editors/admins still mutate through
-- authorized server actions so every change can be audited.
DROP POLICY IF EXISTS "Published posts are visible" ON content.posts;
CREATE POLICY "Published posts are visible" ON content.posts
  FOR SELECT TO anon, authenticated
  USING (is_published = true AND published_at IS NOT NULL AND published_at <= now());

CREATE INDEX IF NOT EXISTS audit_log_created_idx ON system.audit_log(created_at DESC);

