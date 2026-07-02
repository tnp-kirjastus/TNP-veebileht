-- Migration 004: Commerce + Content tables

-- CATEGORIES (hierarchical tree)
CREATE TABLE commerce.categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug        TEXT UNIQUE NOT NULL,
  name_et     TEXT NOT NULL,
  parent_id   UUID REFERENCES commerce.categories(id) ON DELETE SET NULL,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_categories_parent ON commerce.categories (parent_id);
CREATE INDEX idx_categories_sort ON commerce.categories (sort_order);

-- SERIES (book series)
CREATE TABLE content.series (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            TEXT UNIQUE NOT NULL,
  name_et         TEXT NOT NULL,
  description_et  TEXT,
  cover_image     TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_series_slug ON content.series (slug);

-- PRODUCTS
CREATE TABLE commerce.products (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku           TEXT UNIQUE NOT NULL,
  title_et      TEXT NOT NULL,
  title_en      TEXT,
  slug          TEXT UNIQUE NOT NULL,
  description_et TEXT,
  description_en TEXT,
  price         DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  sale_price    DECIMAL(10,2) CHECK (sale_price >= 0),
  sale_start    TIMESTAMPTZ,
  sale_end      TIMESTAMPTZ,
  stock         INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  binding       TEXT,
  pages         INTEGER CHECK (pages IS NULL OR pages > 0),
  release_date  DATE,
  cover_image   TEXT,
  origin        TEXT CHECK (origin IN ('estonian','foreign')),
  is_upcoming   BOOLEAN DEFAULT false,
  is_archived   BOOLEAN DEFAULT false,
  is_featured   BOOLEAN DEFAULT false,
  series_id     UUID REFERENCES content.series(id) ON DELETE SET NULL,
  search_vector tsvector,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  CHECK (sale_price IS NULL OR sale_price <= price),
  CHECK (sale_end IS NULL OR sale_start IS NULL OR sale_end >= sale_start)
);

CREATE INDEX idx_products_search ON commerce.products USING GIN (search_vector);
CREATE INDEX idx_products_title_trgm ON commerce.products USING GIN (title_et gin_trgm_ops);
CREATE INDEX idx_products_sku_trgm ON commerce.products USING GIN (sku gin_trgm_ops);
CREATE INDEX idx_products_slug ON commerce.products (slug);
CREATE INDEX idx_products_price ON commerce.products (price);
CREATE INDEX idx_products_release ON commerce.products (release_date DESC);
CREATE INDEX idx_products_origin ON commerce.products (origin);
CREATE INDEX idx_products_upcoming ON commerce.products (is_upcoming) WHERE is_upcoming = true;
CREATE INDEX idx_products_archived ON commerce.products (is_archived) WHERE is_archived = false;
CREATE INDEX idx_products_series ON commerce.products (series_id);

-- JUNCTION: product <-> category
CREATE TABLE commerce.product_categories (
  product_id  UUID REFERENCES commerce.products(id) ON DELETE CASCADE,
  category_id UUID REFERENCES commerce.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);

CREATE INDEX idx_pc_product ON commerce.product_categories (product_id);
CREATE INDEX idx_pc_category ON commerce.product_categories (category_id);

-- JUNCTION: product <-> person with role
CREATE TABLE commerce.product_people (
  product_id  UUID REFERENCES commerce.products(id) ON DELETE CASCADE,
  person_id   UUID REFERENCES people.people(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('author','translator','designer','illustrator','editor')),
  PRIMARY KEY (product_id, person_id, role)
);

CREATE INDEX idx_pp_product ON commerce.product_people (product_id);
CREATE INDEX idx_pp_person ON commerce.product_people (person_id);
CREATE INDEX idx_pp_role ON commerce.product_people (role);

-- PRODUCT IMAGES
CREATE TABLE commerce.product_images (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID REFERENCES commerce.products(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  sort_order  INTEGER DEFAULT 0
);

-- CARTS
CREATE TABLE commerce.carts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id  TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE commerce.cart_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cart_id     UUID NOT NULL REFERENCES commerce.carts(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES commerce.products(id) ON DELETE CASCADE,
  quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 99),
  UNIQUE (cart_id, product_id)
);

CREATE INDEX idx_cart_session ON commerce.carts (session_id);
CREATE INDEX idx_cartitems_cart ON commerce.cart_items (cart_id);

-- ORDERS
CREATE TABLE commerce.orders (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number      TEXT UNIQUE NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending','payment_pending','paid','processing','shipped','cancelled',
               'payment_failed','expired','manual_review','refunded')
  ),
  customer_name     TEXT NOT NULL,
  customer_email    TEXT NOT NULL,
  customer_phone    TEXT,
  shipping_address  TEXT,
  shipping_method   TEXT,
  subtotal          DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
  shipping_cost     DECIMAL(10,2) DEFAULT 0 CHECK (shipping_cost >= 0),
  total             DECIMAL(10,2) NOT NULL CHECK (total >= 0),
  maksekeskus_id    TEXT,
  confirmation_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE commerce.order_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES commerce.orders(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES commerce.products(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  price       DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  quantity    INTEGER NOT NULL CHECK (quantity > 0)
);

CREATE INDEX idx_orders_email ON commerce.orders (customer_email);
CREATE INDEX idx_orders_status ON commerce.orders (status);
CREATE INDEX idx_orders_token ON commerce.orders (confirmation_token);
CREATE INDEX idx_orderitems_order ON commerce.order_items (order_id);

-- PROMOTIONS
CREATE TABLE commerce.promotions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_et          TEXT NOT NULL,
  discount_percent INTEGER,
  discount_amount  DECIMAL(10,2),
  starts_at        TIMESTAMPTZ,
  ends_at          TIMESTAMPTZ,
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE commerce.promotion_products (
  promotion_id UUID REFERENCES commerce.promotions(id) ON DELETE CASCADE,
  product_id   UUID REFERENCES commerce.products(id) ON DELETE CASCADE,
  PRIMARY KEY (promotion_id, product_id)
);

-- PAYMENT EVENTS
CREATE TABLE commerce.payment_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idempotency_key TEXT UNIQUE NOT NULL,
  order_id        UUID REFERENCES commerce.orders(id),
  event_type      TEXT NOT NULL,
  payload         JSONB,
  processed_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payment_events_order ON commerce.payment_events (order_id);

-- OUTBOX
CREATE TABLE commerce.outbox (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type    TEXT NOT NULL,
  payload       JSONB NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  processed_at  TIMESTAMPTZ,
  attempts      INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  lease_id      UUID,
  leased_until  TIMESTAMPTZ,
  error_code    TEXT,
  dead_lettered_at TIMESTAMPTZ
);

CREATE INDEX idx_outbox_pending ON commerce.outbox (available_at, created_at)
  WHERE processed_at IS NULL AND dead_lettered_at IS NULL;
