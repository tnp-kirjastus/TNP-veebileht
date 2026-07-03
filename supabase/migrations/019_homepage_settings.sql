-- Migration 019: Homepage settings

CREATE TABLE content.homepage (
  key        TEXT PRIMARY KEY DEFAULT 'default',
  hero       JSONB,
  cards      JSONB,
  sections   JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO content.homepage (key) VALUES ('default') ON CONFLICT DO NOTHING;

ALTER TABLE content.homepage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Homepage is publicly visible" ON content.homepage
  FOR SELECT USING (true);

CREATE POLICY "Admins manage homepage" ON content.homepage
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT ON content.homepage TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON content.homepage TO authenticated;
