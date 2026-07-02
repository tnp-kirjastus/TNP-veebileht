-- Migration 003: People schema

CREATE TABLE people.people (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  bio_et      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_people_name_trgm ON people.people USING GIN (name gin_trgm_ops);
CREATE INDEX idx_people_slug ON people.people (slug);
