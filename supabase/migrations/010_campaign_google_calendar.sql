-- Add google_calendar_id to campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS google_calendar_id TEXT;
