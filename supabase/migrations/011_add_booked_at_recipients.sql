-- Migration: Add booked_at to campaign_recipients
-- Description: Adds booked_at column required by trigger_update_recipient_on_booking

ALTER TABLE campaign_recipients 
ADD COLUMN IF NOT EXISTS booked_at TIMESTAMPTZ;

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_booked_at ON campaign_recipients(booked_at);
