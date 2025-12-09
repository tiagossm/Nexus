-- Add missing column for reminder tracking
ALTER TABLE campaign_recipients 
ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;

-- Add comment
COMMENT ON COLUMN campaign_recipients.last_reminder_sent_at IS 'Timestamp of the last reminder sent to this recipient';
