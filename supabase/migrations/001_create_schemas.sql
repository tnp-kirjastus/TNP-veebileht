-- Migration 001: Custom Schemas

CREATE SCHEMA IF NOT EXISTS commerce;
CREATE SCHEMA IF NOT EXISTS content;
CREATE SCHEMA IF NOT EXISTS people;
CREATE SCHEMA IF NOT EXISTS system;
CREATE SCHEMA IF NOT EXISTS smaily;

GRANT USAGE ON SCHEMA commerce TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA content TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA people TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA system TO service_role;
GRANT USAGE ON SCHEMA smaily TO service_role;
