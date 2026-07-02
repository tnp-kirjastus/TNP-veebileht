-- Migration 008: Search function

CREATE OR REPLACE FUNCTION commerce.search_products(
  search_term     TEXT DEFAULT NULL,
  category_slug   TEXT DEFAULT NULL,
  origin_filter   TEXT DEFAULT NULL,
  sale_only       BOOLEAN DEFAULT false,
  upcoming_only   BOOLEAN DEFAULT false,
  person_role     TEXT DEFAULT NULL,
  person_slug     TEXT DEFAULT NULL,
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
  IF sort_by NOT IN ('relevance','newest','oldest','price-asc','price-desc','az','za') THEN
    sort_by := CASE WHEN NULLIF(btrim(search_term), '') IS NULL THEN 'newest' ELSE 'relevance' END;
  END IF;

  IF NULLIF(btrim(search_term), '') IS NOT NULL THEN
    tsq := websearch_to_tsquery('public.et', left(search_term, 200));
  END IF;

  IF category_slug IS NOT NULL THEN
    WITH RECURSIVE cat_tree AS (
      SELECT id FROM commerce.categories WHERE slug = category_slug
      UNION ALL
      SELECT c.id FROM commerce.categories c
      JOIN cat_tree ct ON c.parent_id = ct.id
    )
    SELECT array_agg(id) INTO category_ids FROM cat_tree;
  END IF;

  RETURN (
    WITH filtered AS MATERIALIZED (
      SELECT
        p.id, p.title_et, p.slug, p.price, p.sale_price,
        commerce.effective_price(p.*) AS effective_price,
        p.cover_image, p.is_upcoming,
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
      WHERE p.is_archived = false
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
        AND (person_role IS NULL OR person_slug IS NULL OR EXISTS (
          SELECT 1 FROM commerce.product_people pp
          JOIN people.people pl ON pl.id = pp.person_id
          WHERE pp.product_id = p.id
            AND pp.role = person_role
            AND pl.slug = person_slug
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

REVOKE ALL ON FUNCTION commerce.search_products(TEXT,TEXT,TEXT,BOOLEAN,BOOLEAN,TEXT,TEXT,TEXT,INTEGER,INTEGER)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION commerce.search_products(TEXT,TEXT,TEXT,BOOLEAN,BOOLEAN,TEXT,TEXT,TEXT,INTEGER,INTEGER)
  TO anon, authenticated, service_role;
