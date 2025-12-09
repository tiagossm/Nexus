-- Migration 007: Multicanal Tracking System
-- Adds support for Email, WhatsApp, SMS with detailed event tracking

-- =====================================================
-- MESSAGE EVENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS message_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES campaign_recipients(id) ON DELETE CASCADE,
  
  -- Event details
  event_type TEXT NOT NULL CHECK (event_type IN (
    'sent', 'delivered', 'bounced', 'failed',
    'opened', 'clicked', 'read',
    'booked', 'completed', 'cancelled', 'unsubscribed'
  )),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp', 'sms')),
  
  -- Additional contextual data
  metadata JSONB DEFAULT '{}'::jsonb,
  -- Examples:
  -- email sent: { message_id, smtp_status, subject }
  -- email opened: { ip_address, user_agent, timestamp }
  -- clicked: { url, ip_address, user_agent }
  -- whatsapp: { message_id, phone_number, provider_status }
  -- sms: { message_id, phone_number, provider, cost }
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_message_events_campaign ON message_events(campaign_id);
CREATE INDEX idx_message_events_recipient ON message_events(recipient_id);
CREATE INDEX idx_message_events_type ON message_events(event_type);
CREATE INDEX idx_message_events_channel ON message_events(channel);
CREATE INDEX idx_message_events_created ON message_events(created_at DESC);

COMMENT ON TABLE message_events IS 'Detailed event tracking for all campaign communications across channels';
COMMENT ON COLUMN message_events.metadata IS 'Channel-specific data: email (message_id, smtp_status), whatsapp (message_id, phone), sms (provider, cost)';

-- =====================================================
-- WEBHOOK CONFIGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS webhook_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms')),
  webhook_url TEXT NOT NULL,
  secret_key TEXT, -- For HMAC signature validation
  headers JSONB DEFAULT '{}'::jsonb, -- Custom headers to send
  retry_config JSONB DEFAULT '{"max_retries": 3, "backoff": "exponential"}'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_configs_channel ON webhook_configs(channel);
CREATE INDEX idx_webhook_configs_active ON webhook_configs(active);

COMMENT ON TABLE webhook_configs IS 'Configuration for n8n webhooks to send WhatsApp and SMS messages';
COMMENT ON COLUMN webhook_configs.secret_key IS 'Secret for HMAC-SHA256 signature validation';

-- =====================================================
-- UPDATE CAMPAIGN_RECIPIENTS TABLE
-- =====================================================

-- Add channel support
ALTER TABLE campaign_recipients 
  ADD COLUMN IF NOT EXISTS channel TEXT CHECK (channel IN ('email', 'whatsapp', 'sms')),
  ADD COLUMN IF NOT EXISTS phone TEXT, -- E.164 format: +5511999999999
  ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'pending' 
    CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  ADD COLUMN IF NOT EXISTS last_channel_sent TEXT CHECK (last_channel_sent IN ('email', 'whatsapp', 'sms')),
  ADD COLUMN IF NOT EXISTS send_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fallback_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS unsubscribed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ;

-- Add detailed tracking timestamps (beyond the basic sent_at)
ALTER TABLE campaign_recipients
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_clicked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS open_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0;

COMMENT ON COLUMN campaign_recipients.channel IS 'Preferred channel for this recipient (can be overridden per send)';
COMMENT ON COLUMN campaign_recipients.phone IS 'Phone number in E.164 format for WhatsApp/SMS';
COMMENT ON COLUMN campaign_recipients.delivery_status IS 'Last delivery attempt status';
COMMENT ON COLUMN campaign_recipients.fallback_enabled IS 'Allow automatic fallback to other channels if delivery fails';

-- =====================================================
-- UPDATE CAMPAIGNS TABLE
-- =====================================================

-- Add multicanal configuration
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS primary_channel TEXT DEFAULT 'email' 
    CHECK (primary_channel IN ('email', 'whatsapp', 'sms')),
  ADD COLUMN IF NOT EXISTS fallback_channels JSONB DEFAULT '["sms", "whatsapp"]'::jsonb,
  ADD COLUMN IF NOT EXISTS fallback_delay_minutes INTEGER DEFAULT 60; -- Wait before fallback

-- Add detailed metrics
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS total_sent INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_delivered INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_bounced INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_failed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_opened INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_clicked INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_unsubscribed INTEGER DEFAULT 0;

-- Channel-specific metrics
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS metrics_by_channel JSONB DEFAULT '{
    "email": {"sent": 0, "delivered": 0, "opened": 0, "clicked": 0},
    "whatsapp": {"sent": 0, "delivered": 0, "read": 0},
    "sms": {"sent": 0, "delivered": 0}
  }'::jsonb;

COMMENT ON COLUMN campaigns.primary_channel IS 'Default channel for this campaign';
COMMENT ON COLUMN campaigns.fallback_channels IS 'Ordered list of fallback channels if primary fails';
COMMENT ON COLUMN campaigns.metrics_by_channel IS 'Real-time metrics broken down by channel';

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Update campaigns.updated_at
CREATE OR REPLACE FUNCTION update_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_campaigns_updated_at ON campaigns;
CREATE TRIGGER trigger_update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_campaigns_updated_at();

-- Update webhook_configs.updated_at
CREATE OR REPLACE FUNCTION update_webhook_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_webhook_configs_updated_at
  BEFORE UPDATE ON webhook_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_webhook_configs_updated_at();

-- Auto-update campaign metrics when event is created
CREATE OR REPLACE FUNCTION update_campaign_metrics_on_event()
RETURNS TRIGGER AS $$
DECLARE
  channel_metrics JSONB;
BEGIN
  -- Update campaign totals based on event type
  IF NEW.event_type = 'sent' THEN
    UPDATE campaigns SET total_sent = total_sent + 1 WHERE id = NEW.campaign_id;
  ELSIF NEW.event_type = 'delivered' THEN
    UPDATE campaigns SET total_delivered = total_delivered + 1 WHERE id = NEW.campaign_id;
    UPDATE campaign_recipients SET delivered_at = NEW.created_at WHERE id = NEW.recipient_id;
  ELSIF NEW.event_type = 'bounced' THEN
    UPDATE campaigns SET total_bounced = total_bounced + 1 WHERE id = NEW.campaign_id;
    UPDATE campaign_recipients SET bounced_at = NEW.created_at WHERE id = NEW.recipient_id;
  ELSIF NEW.event_type = 'failed' THEN
    UPDATE campaigns SET total_failed = total_failed + 1 WHERE id = NEW.campaign_id;
    UPDATE campaign_recipients SET failed_at = NEW.created_at WHERE id = NEW.recipient_id;
  ELSIF NEW.event_type = 'opened' THEN
    UPDATE campaigns SET total_opened = total_opened + 1 WHERE id = NEW.campaign_id;
    UPDATE campaign_recipients 
      SET last_opened_at = NEW.created_at, open_count = open_count + 1 
      WHERE id = NEW.recipient_id;
  ELSIF NEW.event_type = 'clicked' THEN
    UPDATE campaigns SET total_clicked = total_clicked + 1 WHERE id = NEW.campaign_id;
    UPDATE campaign_recipients 
      SET last_clicked_at = NEW.created_at, click_count = click_count + 1 
      WHERE id = NEW.recipient_id;
  ELSIF NEW.event_type = 'unsubscribed' THEN
    UPDATE campaigns SET total_unsubscribed = total_unsubscribed + 1 WHERE id = NEW.campaign_id;
    UPDATE campaign_recipients 
      SET unsubscribed = true, unsubscribed_at = NEW.created_at 
      WHERE id = NEW.recipient_id;
  END IF;
  
  -- Update channel-specific metrics
  UPDATE campaigns
  SET metrics_by_channel = jsonb_set(
    metrics_by_channel,
    ARRAY[NEW.channel, NEW.event_type],
    to_jsonb(COALESCE((metrics_by_channel->NEW.channel->>NEW.event_type)::int, 0) + 1)
  )
  WHERE id = NEW.campaign_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_campaign_metrics_on_event
  AFTER INSERT ON message_events
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_metrics_on_event();

-- =====================================================
-- DATA RETENTION POLICY
-- =====================================================

-- Optional: Auto-delete old events (GDPR/LGPD compliance)
-- Uncomment if needed:
-- CREATE OR REPLACE FUNCTION delete_old_message_events()
-- RETURNS void AS $$
-- BEGIN
--   DELETE FROM message_events WHERE created_at < NOW() - INTERVAL '90 days';
-- END;
-- $$ LANGUAGE plpgsql;

-- =====================================================
-- INDEXES FOR ANALYTICS QUERIES
-- =====================================================

-- Composite indexes for common queries
CREATE INDEX idx_events_campaign_type_date ON message_events(campaign_id, event_type, created_at DESC);
CREATE INDEX idx_events_recipient_channel_date ON message_events(recipient_id, channel, created_at DESC);

-- Recipient status queries
CREATE INDEX idx_recipients_delivery_status ON campaign_recipients(delivery_status);
CREATE INDEX idx_recipients_unsubscribed ON campaign_recipients(unsubscribed) WHERE unsubscribed = true;
