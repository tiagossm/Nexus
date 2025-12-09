-- Migration: Add message fields to campaigns table
-- Adds support for customizable invite and reminder messages

-- Add message columns to campaigns table
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS invite_message JSONB,
ADD COLUMN IF NOT EXISTS reminder_message JSONB;

-- Add comments for documentation
COMMENT ON COLUMN campaigns.invite_message IS 'JSON object containing invite message details: {template_id?, channel, subject?, body}';
COMMENT ON COLUMN campaigns.reminder_message IS 'JSON object containing reminder message details: {template_id?, channel, subject?, body, send_hours_before?}';

-- Example of invite_message structure:
-- {
--   "template_id": "uuid-of-template",
--   "channel": "email",
--   "subject": "Confirmação de Exame",
--   "body": "Olá {{contact.name}}, confirmamos seu exame..."
-- }

-- Example of reminder_message structure:
-- {
--   "template_id": "uuid-of-template",
--   "channel": "whatsapp",
--   "body": "Lembrete: seu exame é amanhã às {{exam.time}}",
--   "send_hours_before": 24
-- }
