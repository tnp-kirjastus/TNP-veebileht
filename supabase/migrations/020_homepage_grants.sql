-- Migration 020: Fix homepage grants for service_role

GRANT ALL ON content.homepage TO service_role;
