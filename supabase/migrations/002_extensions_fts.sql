-- Migration 002: Extensions + Estonian FTS

CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TEXT SEARCH CONFIGURATION public.et (COPY = pg_catalog.simple);
ALTER TEXT SEARCH CONFIGURATION public.et
  ALTER MAPPING FOR asciiword, asciihword, hword_asciipart,
                    word, hword, hword_part
  WITH unaccent, simple;
