-- Migration 036: privaatne bucket impordi ZIP-arhiividele
-- Brauser laeb arhiivi otse Storage'i signeeritud URL-iga (mitte enam
-- base64 server action'i kaudu, mis takistaks >1MB faile).
-- Ainult service_role pääseb ligi (server laeb alla, töötleb, kustutab).

INSERT INTO storage.buckets (id, name, public)
VALUES ('import-archives', 'import-archives', false)
ON CONFLICT (id) DO NOTHING;
