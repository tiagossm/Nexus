-- Migration 005: Fix Contacts Schema
-- Ensures contacts table exists and has all necessary columns and constraints

-- 1. Create contacts table if it doesn't exist
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add missing columns if they don't exist
DO $$
BEGIN
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS cpf TEXT;
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS age INTEGER;
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pendente';
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS invite_count INTEGER DEFAULT 0;
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_invite_sent_at TIMESTAMPTZ;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- 3. Ensure email is unique (required for upsert)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'contacts_email_key'
    ) THEN
        ALTER TABLE contacts ADD CONSTRAINT contacts_email_key UNIQUE (email);
    END IF;
END $$;

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_cpf ON contacts(cpf);
