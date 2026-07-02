-- Migration 006: Search vector rebuild function & triggers

CREATE OR REPLACE FUNCTION commerce.rebuild_product_search_vector(p_product_id UUID)
RETURNS void AS $$
  UPDATE commerce.products p SET search_vector =
    setweight(to_tsvector('public.et', COALESCE(p.title_et, '')), 'A') ||
    setweight(to_tsvector('public.et', COALESCE(p.description_et, '')), 'B') ||
    setweight(to_tsvector('public.et', COALESCE(p.sku, '')), 'A') ||
    setweight(to_tsvector('public.et', COALESCE(
      (SELECT string_agg(ppl.name, ' ')
       FROM commerce.product_people pp
       JOIN people.people ppl ON ppl.id = pp.person_id
       WHERE pp.product_id = p.id
      ), '')
    ), 'B') ||
    setweight(to_tsvector('public.et', COALESCE(
      (SELECT string_agg(c.name_et, ' ')
       FROM commerce.product_categories pc
       JOIN commerce.categories c ON c.id = pc.category_id
       WHERE pc.product_id = p.id
      ), '')
    ), 'B') ||
    setweight(to_tsvector('public.et', COALESCE(
      (SELECT s.name_et FROM content.series s
       WHERE s.id = p.series_id
      ), '')
    ), 'B')
  WHERE p.id = p_product_id;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog;

CREATE OR REPLACE FUNCTION commerce.trg_rebuild_product_search()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM commerce.rebuild_product_search_vector(OLD.product_id);
    RETURN OLD;
  END IF;
  PERFORM commerce.rebuild_product_search_vector(NEW.product_id);
  IF TG_OP = 'UPDATE' AND OLD.product_id IS DISTINCT FROM NEW.product_id THEN
    PERFORM commerce.rebuild_product_search_vector(OLD.product_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog;

CREATE OR REPLACE FUNCTION commerce.trg_rebuild_product_search_row()
RETURNS trigger AS $$
BEGIN
  PERFORM commerce.rebuild_product_search_vector(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog;

CREATE TRIGGER trg_product_search_row
  AFTER INSERT OR UPDATE OF title_et, description_et, sku, series_id ON commerce.products
  FOR EACH ROW EXECUTE FUNCTION commerce.trg_rebuild_product_search_row();

CREATE TRIGGER trg_pp_search_update
  AFTER INSERT OR UPDATE OR DELETE ON commerce.product_people
  FOR EACH ROW EXECUTE FUNCTION commerce.trg_rebuild_product_search();

CREATE TRIGGER trg_pc_search_update
  AFTER INSERT OR UPDATE OR DELETE ON commerce.product_categories
  FOR EACH ROW EXECUTE FUNCTION commerce.trg_rebuild_product_search();

-- Rename triggers
CREATE OR REPLACE FUNCTION commerce.trg_rebuild_products_for_related_name()
RETURNS trigger AS $$
DECLARE product_id UUID;
BEGIN
  IF TG_TABLE_SCHEMA = 'people' THEN
    FOR product_id IN SELECT pp.product_id FROM commerce.product_people pp WHERE pp.person_id = NEW.id LOOP
      PERFORM commerce.rebuild_product_search_vector(product_id);
    END LOOP;
  ELSIF TG_TABLE_NAME = 'categories' THEN
    FOR product_id IN SELECT pc.product_id FROM commerce.product_categories pc WHERE pc.category_id = NEW.id LOOP
      PERFORM commerce.rebuild_product_search_vector(product_id);
    END LOOP;
  ELSE
    FOR product_id IN SELECT p.id FROM commerce.products p WHERE p.series_id = NEW.id LOOP
      PERFORM commerce.rebuild_product_search_vector(product_id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog;

CREATE TRIGGER trg_person_name_search AFTER UPDATE OF name ON people.people
  FOR EACH ROW EXECUTE FUNCTION commerce.trg_rebuild_products_for_related_name();
CREATE TRIGGER trg_category_name_search AFTER UPDATE OF name_et ON commerce.categories
  FOR EACH ROW EXECUTE FUNCTION commerce.trg_rebuild_products_for_related_name();
CREATE TRIGGER trg_series_name_search AFTER UPDATE OF name_et ON content.series
  FOR EACH ROW EXECUTE FUNCTION commerce.trg_rebuild_products_for_related_name();
