-- Migration 026: Store settings
-- Stores configurable settings previously hardcoded in source files.
-- The shipping, email, vat, company info, and social links are stored as JSONB
-- so the structure can evolve without ALTER TABLE migrations.

CREATE TABLE content.settings (
  key        TEXT PRIMARY KEY DEFAULT 'store',
  shipping   JSONB,
  email      JSONB,
  vat        JSONB,
  company    JSONB,
  social     JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO content.settings (key, shipping, email, vat, company, social)
VALUES (
  'store',
  '{
    "rates": [
      {"carrier": "omniva", "method": "parcel_machine", "price": 5.0, "freeFrom": 40, "label_et": "Omniva pakiautomaat", "label_en": "Omniva parcel machine"},
      {"carrier": "smartpost", "method": "parcel_machine", "price": 3.5, "freeFrom": 40, "label_et": "Smartpost pakiautomaat", "label_en": "Smartpost parcel machine"}
    ]
  }'::jsonb,
  '{
    "fromAddress": "Kirjastus Tänapäev <tellimused@tnp.ee>",
    "orderSubject": "Tellimus {{orderNumber}} kinnitatud",
    "orderBody": "Tere {{customerName}}!\n\nSinu tellimus nr {{orderNumber}} summas {{total}} \u20ac on kinnitatud.\n\nTellitud raamatud:\n{{itemLines}}\n\nSaadame raamatud esimesel v\u00f5imalusel. Tarne kohta saadame eraldi teavituse.\n\nK\u00fcsimuste korral kirjuta: tellimused@tnp.ee\n\nKirjastus T\u00e4nap\u00e4ev"
  }'::jsonb,
  '{
    "percent": 9
  }'::jsonb,
  '{
    "name": "Kirjastus T\u00e4nap\u00e4ev",
    "email": "tellimused@tnp.ee",
    "phone": "",
    "address": "",
    "regCode": ""
  }'::jsonb,
  '{
    "facebook": "",
    "instagram": ""
  }'::jsonb
) ON CONFLICT DO NOTHING;

ALTER TABLE content.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settings are publicly readable" ON content.settings
  FOR SELECT USING (true);

CREATE POLICY "Admins manage settings" ON content.settings
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT ON content.settings TO anon, authenticated;
GRANT ALL ON content.settings TO service_role;
