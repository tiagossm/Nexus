-- Migration: 002_enterprise_features.sql
-- Description: Adds tables for Campaigns, Mass Invites, and Event-Specific Availability

-- 1. Add availability_config to events table
-- This allows each event to have its own specific availability rules (overriding global rules)
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS availability_config JSONB DEFAULT NULL;

-- 2. Create CAMPAIGNS table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_type_id TEXT REFERENCES events(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'completed', 'archived')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at DESC);

-- 3. Create CAMPAIGN_RECIPIENTS table
CREATE TABLE IF NOT EXISTS campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  unique_link_id TEXT, -- Will link to single_use_links table if generated
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'opened', 'clicked', 'booked', 'failed')),
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  booked_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}', -- Store extra data like "Setor", "Cargo" from CSV
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics and lookups
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign_id ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_contact_id ON campaign_recipients(contact_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON campaign_recipients(status);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_unique_link ON campaign_recipients(unique_link_id);

-- 4. Update SINGLE_USE_LINKS to support Campaigns
ALTER TABLE single_use_links
ADD COLUMN IF NOT EXISTS campaign_recipient_id UUID REFERENCES campaign_recipients(id) ON DELETE SET NULL;

-- 5. Trigger to update updated_at on campaigns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
