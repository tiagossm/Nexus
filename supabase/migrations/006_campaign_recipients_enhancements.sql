-- Migration 006: Enhancements to campaign_recipients
-- Adds status, invite_count, metadata columns and indexes

-- 1. Add columns if they don't exist
DO $$
BEGIN
    ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
    ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS invite_count INTEGER DEFAULT 0;
    ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- 2. Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON campaign_recipients(status);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign_id ON campaign_recipients(campaign_id);
