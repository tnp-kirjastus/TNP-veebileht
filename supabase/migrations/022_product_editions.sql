ALTER TABLE commerce.products
ADD COLUMN IF NOT EXISTS editions JSONB DEFAULT '[]';

COMMENT ON COLUMN commerce.products.editions IS
  'Kordustr\u00fckkide info: [{ "type": "2. tr\u00fckk", "date": "2025-01-01" }, ...]';
