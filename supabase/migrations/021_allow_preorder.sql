-- Lisa veerg, mis määrab kas Ilmumas raamatut saab ette tellida
ALTER TABLE commerce.products
ADD COLUMN allow_preorder BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN commerce.products.allow_preorder IS
  'Kui true ja is_upcoming=true, saab raamatut ette tellida. Kui false, näidatakse ainult "Ilmumas" ilma tellimisvõimaluseta.';
