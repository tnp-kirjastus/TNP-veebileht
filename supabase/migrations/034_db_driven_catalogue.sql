-- Migration 034: DB-põhine kataloog (asendab build-time JSON kihi)
--
-- 1) commerce.v_products — täielik toote-read-view serveripoolseks lugemiseks
--    (detailvaade, seotud tooted, sitemap, admin). Kokku ühes kohas:
--    toode + seeria + kategooriad + inimesed + efektiivne hind.
-- 2) commerce.search_products laiendatud signatuur:
--    - mitu kategooriat korraga (category_slugs TEXT[])
--    - mitu isikufiltrit korraga (person_filters JSONB, {roll: nimi|slug})
--    - kampaania-aken (sale_start/sale_end täpne vaste, sale_open = püsivalt soodsad)
--    - scope: 'active' | 'archived' | 'all'
--    - väljundisse lisanduvad: sku, sale_start, sale_end, is_archived, stock

-- 0) Efektiivse hinna reegel kooskõlla rakendusega: soodushind kehtib vaid
--    siis, kui ta on tavahinnast VÄIKSEM (seni võis sale_price > price anda
--    vale "efektiivse hinna").
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION commerce.effective_price(p commerce.products)
RETURNS DECIMAL(10,2) AS $$
  SELECT CASE
    WHEN p.sale_price IS NOT NULL
     AND p.sale_price < p.price
     AND (p.sale_start IS NULL OR p.sale_start <= now())
     AND (p.sale_end IS NULL OR p.sale_end >= now())
    THEN p.sale_price
    ELSE p.price
  END;
$$ LANGUAGE sql STABLE SET search_path = pg_catalog;

-- ---------------------------------------------------------------------------
-- 1) Täielik tooteview (ainult serveripoolne lugemine service_role'iga)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW commerce.v_products AS
SELECT
  p.id,
  p.sku,
  p.title_et,
  p.title_en,
  p.slug,
  p.description_et,
  p.description_en,
  p.price,
  p.sale_price,
  p.sale_start,
  p.sale_end,
  p.stock,
  p.binding,
  p.pages,
  p.release_date,
  p.origin,
  p.is_upcoming,
  p.is_archived,
  p.is_featured,
  p.allow_preorder,
  p.cover_image,
  p.editions,
  p.created_at,
  p.updated_at,
  commerce.effective_price(p.*) AS effective_price,
  (p.sale_price IS NOT NULL
   AND (p.sale_start IS NULL OR p.sale_start <= now())
   AND (p.sale_end IS NULL OR p.sale_end >= now())) AS is_on_sale,
  s.name_et AS series_name,
  s.slug AS series_slug,
  COALESCE(cats.names, '[]'::jsonb) AS categories,
  COALESCE(cats.ids, '{}'::uuid[]) AS category_ids,
  COALESCE(auth.ids, '{}'::uuid[]) AS author_ids,
  COALESCE(pp.people, '{}'::jsonb) AS people
FROM commerce.products p
LEFT JOIN content.series s ON s.id = p.series_id
LEFT JOIN LATERAL (
  SELECT
    jsonb_agg(c.name_et ORDER BY c.sort_order, c.name_et) AS names,
    array_agg(c.id) AS ids
  FROM commerce.product_categories pc
  JOIN commerce.categories c ON c.id = pc.category_id
  WHERE pc.product_id = p.id
) cats ON true
LEFT JOIN LATERAL (
  SELECT array_agg(DISTINCT pp.person_id) AS ids
  FROM commerce.product_people pp
  WHERE pp.product_id = p.id AND pp.role = 'author'
) auth ON true
LEFT JOIN LATERAL (
  SELECT jsonb_object_agg(role, names) AS people
  FROM (
    SELECT pp.role, jsonb_agg(pl.name ORDER BY pl.name) AS names
    FROM commerce.product_people pp
    JOIN people.people pl ON pl.id = pp.person_id
    WHERE pp.product_id = p.id
    GROUP BY pp.role
  ) r
) pp ON true;

REVOKE ALL ON commerce.v_products FROM PUBLIC, anon, authenticated;
GRANT SELECT ON commerce.v_products TO service_role;

-- ---------------------------------------------------------------------------
-- 2) Laiendatud avalik otsingu-/loetelu-RPC (asendab 008 signatuuri)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS commerce.search_products(TEXT,TEXT,TEXT,BOOLEAN,BOOLEAN,TEXT,TEXT,TEXT,INTEGER,INTEGER);

CREATE OR REPLACE FUNCTION commerce.search_products(
  search_term     TEXT DEFAULT NULL,
  category_slugs  TEXT[] DEFAULT NULL,
  origin_filter   TEXT DEFAULT NULL,
  sale_only       BOOLEAN DEFAULT false,
  upcoming_only   BOOLEAN DEFAULT false,
  person_filters  JSONB DEFAULT NULL,
  sale_start      TIMESTAMPTZ DEFAULT NULL,
  sale_end        TIMESTAMPTZ DEFAULT NULL,
  sale_open       BOOLEAN DEFAULT false,
  scope           TEXT DEFAULT 'active',
  sort_by         TEXT DEFAULT 'newest',
  page_num        INTEGER DEFAULT 1,
  page_size       INTEGER DEFAULT 24
)
RETURNS JSONB AS $$
DECLARE
  tsq tsquery;
  category_ids UUID[];
BEGIN
  page_num := GREATEST(COALESCE(page_num, 1), 1);
  page_size := LEAST(GREATEST(COALESCE(page_size, 24), 1), 60);
  IF scope NOT IN ('active','archived','all') THEN scope := 'active'; END IF;
  IF sort_by NOT IN ('relevance','newest','oldest','price-asc','price-desc','az','za') THEN
    sort_by := CASE WHEN NULLIF(btrim(search_term), '') IS NULL THEN 'newest' ELSE 'relevance' END;
  END IF;

  IF NULLIF(btrim(search_term), '') IS NOT NULL THEN
    tsq := websearch_to_tsquery('public.et', left(search_term, 200));
  END IF;

  IF category_slugs IS NOT NULL AND array_length(category_slugs, 1) IS NOT NULL THEN
    WITH RECURSIVE cat_tree AS (
      SELECT id FROM commerce.categories WHERE slug = ANY(category_slugs)
      UNION ALL
      SELECT c.id FROM commerce.categories c
      JOIN cat_tree ct ON c.parent_id = ct.id
    )
    SELECT array_agg(DISTINCT id) INTO category_ids FROM cat_tree;
  END IF;

  RETURN (
    WITH filtered AS MATERIALIZED (
      SELECT
        p.id, p.sku, p.title_et, p.slug, p.price, p.sale_price,
        commerce.effective_price(p.*) AS effective_price,
        p.sale_start, p.sale_end,
        p.cover_image, p.is_upcoming, p.is_archived, p.stock,
        (p.sale_price IS NOT NULL
         AND (p.sale_start IS NULL OR p.sale_start <= now())
         AND (p.sale_end IS NULL OR p.sale_end >= now())) AS is_on_sale,
        p.release_date, p.origin,
        (SELECT string_agg(pl.name, ', ' ORDER BY pp.person_id)
         FROM commerce.product_people pp
         JOIN people.people pl ON pl.id = pp.person_id
         WHERE pp.product_id = p.id AND pp.role = 'author') AS author_names,
        CASE WHEN tsq IS NOT NULL
          THEN ts_rank(p.search_vector, tsq, 32) ELSE NULL
        END AS rank
      FROM commerce.products p
      WHERE (
          (scope = 'active' AND p.is_archived = false)
          OR (scope = 'archived' AND p.is_archived = true)
          OR (scope = 'all')
        )
        AND (tsq IS NULL OR p.search_vector @@ tsq)
        AND (category_ids IS NULL OR EXISTS (
          SELECT 1 FROM commerce.product_categories pc
          WHERE pc.product_id = p.id AND pc.category_id = ANY(category_ids)
        ))
        AND (origin_filter IS NULL OR p.origin = origin_filter)
        AND (NOT sale_only OR (
          p.sale_price IS NOT NULL
          AND (p.sale_start IS NULL OR p.sale_start <= now())
          AND (p.sale_end IS NULL OR p.sale_end >= now())
        ))
        AND (NOT upcoming_only OR p.is_upcoming = true)
        AND (NOT sale_open OR (
          p.sale_price IS NOT NULL AND p.sale_start IS NULL AND p.sale_end IS NULL
        ))
        AND (sale_start IS NULL OR p.sale_start = sale_start)
        AND (sale_end IS NULL OR p.sale_end = sale_end)
        AND (person_filters IS NULL OR NOT EXISTS (
          SELECT 1 FROM jsonb_each_text(person_filters) pf(role, val)
          WHERE NOT EXISTS (
            SELECT 1 FROM commerce.product_people pp
            JOIN people.people pl ON pl.id = pp.person_id
            WHERE pp.product_id = p.id
              AND pp.role = pf.role
              AND (pl.slug = pf.val OR pl.name = pf.val)
          )
        ))
    ),
    counted AS (
      SELECT count(*)::INTEGER AS total FROM filtered
    ),
    paged AS (
      SELECT * FROM filtered
      ORDER BY
        CASE WHEN sort_by = 'relevance' AND tsq IS NOT NULL THEN rank END DESC NULLS LAST,
        CASE WHEN sort_by = 'newest'     THEN release_date END DESC NULLS LAST,
        CASE WHEN sort_by = 'oldest'     THEN release_date END ASC  NULLS LAST,
        CASE WHEN sort_by = 'price-asc'  THEN effective_price END ASC,
        CASE WHEN sort_by = 'price-desc' THEN effective_price END DESC,
        CASE WHEN sort_by = 'az'         THEN title_et END ASC,
        CASE WHEN sort_by = 'za'         THEN title_et END DESC,
        id ASC
      LIMIT page_size
      OFFSET (page_num - 1) * page_size
    )
    SELECT jsonb_build_object(
      'products',    COALESCE((SELECT jsonb_agg(row_to_json(paged.*)) FROM paged), '[]'::JSONB),
      'total_count', (SELECT total FROM counted),
      'page',        page_num,
      'total_pages', (SELECT CEIL(total::NUMERIC / page_size) FROM counted)
    )
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog;

REVOKE ALL ON FUNCTION commerce.search_products(TEXT,TEXT[],TEXT,BOOLEAN,BOOLEAN,JSONB,TIMESTAMPTZ,TIMESTAMPTZ,BOOLEAN,TEXT,TEXT,INTEGER,INTEGER)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION commerce.search_products(TEXT,TEXT[],TEXT,BOOLEAN,BOOLEAN,JSONB,TIMESTAMPTZ,TIMESTAMPTZ,BOOLEAN,TEXT,TEXT,INTEGER,INTEGER)
  TO anon, authenticated, service_role;

-- Indeksid filtrite ja sortimise jaoks (2881 toote juures peamiselt tulevikindlustus)
CREATE INDEX IF NOT EXISTS idx_products_active_release ON commerce.products (release_date DESC NULLS LAST) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS idx_product_categories_category ON commerce.product_categories (category_id);
CREATE INDEX IF NOT EXISTS idx_product_people_person ON commerce.product_people (person_id, role);
