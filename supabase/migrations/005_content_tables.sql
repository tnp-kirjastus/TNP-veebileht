-- Migration 005: Content tables

CREATE TABLE content.posts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug          TEXT UNIQUE NOT NULL,
  title_et      TEXT NOT NULL,
  excerpt_et    TEXT,
  content_et    TEXT,
  image_url     TEXT,
  published_at  TIMESTAMPTZ,
  is_published  BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE content.pages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug          TEXT UNIQUE NOT NULL,
  title_et      TEXT NOT NULL,
  content_et    TEXT,
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE content.contact_messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  message     TEXT NOT NULL,
  locale      TEXT DEFAULT 'et',
  is_read     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE content.campaigns (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            TEXT UNIQUE NOT NULL,
  name_et         TEXT NOT NULL,
  description_et  TEXT,
  banner_url      TEXT,
  starts_at       TIMESTAMPTZ,
  ends_at         TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT true
);

CREATE TABLE content.campaign_products (
  campaign_id UUID REFERENCES content.campaigns(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES commerce.products(id) ON DELETE CASCADE,
  PRIMARY KEY (campaign_id, product_id)
);

-- System tables
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  role        TEXT DEFAULT 'viewer' CHECK (role IN ('admin','editor','viewer')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_profiles_role ON public.profiles (role);

CREATE TABLE system.rate_limits (
  ip            TEXT NOT NULL,
  endpoint      TEXT NOT NULL,
  window_start  TIMESTAMPTZ DEFAULT now(),
  request_count INTEGER DEFAULT 1,
  PRIMARY KEY (ip, endpoint)
);
