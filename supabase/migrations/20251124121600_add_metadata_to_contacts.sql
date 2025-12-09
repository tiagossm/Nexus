-- Migration: 003_add_metadata_to_contacts.sql
-- Description: Adds metadata column to contacts table to support dynamic fields from CSV imports

ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Index for faster JSONB queries if needed later
CREATE INDEX IF NOT EXISTS idx_contacts_metadata ON contacts USING gin (metadata);
