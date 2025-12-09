-- Migration: Companies with Email Branding
-- Description: Creates companies table for storing email branding settings

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#4F46E5',
  footer_text TEXT DEFAULT 'Este email foi enviado por {{company_name}}',
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  website_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_active ON companies(is_active);

-- Add company_id to campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- Create RLS policy (permissive for now)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Companies" ON companies
  FOR ALL USING (true) WITH CHECK (true);

-- Insert a default company
INSERT INTO companies (name, logo_url, primary_color, footer_text, contact_email)
VALUES (
  'Nexus Agenda',
  NULL,
  '#4F46E5',
  'Este email foi enviado por Nexus Agenda. Para dúvidas, entre em contato.',
  'contato@nexusagenda.com'
) ON CONFLICT DO NOTHING;
