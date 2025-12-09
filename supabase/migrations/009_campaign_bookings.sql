-- Migration: Create campaign_bookings table for campaign-specific scheduling
-- This table stores actual appointment bookings linked to campaigns

-- =====================================================
-- CAMPAIGN BOOKINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS campaign_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES campaign_recipients(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  
  -- Appointment data
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show', 'rescheduled')),
  
  -- Client data (denormalized for convenience)
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  client_cpf TEXT,  -- Required for SOC integration
  
  -- Metadata
  notes TEXT,
  cancellation_reason TEXT,
  
  -- Google Calendar Integration
  google_event_id TEXT,
  google_synced_at TIMESTAMPTZ,
  
  -- SOC Integration (SOAP)
  soc_protocolo TEXT,
  soc_sync_status TEXT DEFAULT 'pending' CHECK (soc_sync_status IN ('pending', 'synced', 'error', 'not_applicable')),
  soc_response JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent double-booking for same campaign and timeslot
  UNIQUE(campaign_id, start_time)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_campaign_bookings_campaign ON campaign_bookings(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_bookings_start_time ON campaign_bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_campaign_bookings_status ON campaign_bookings(status);
CREATE INDEX IF NOT EXISTS idx_campaign_bookings_contact ON campaign_bookings(contact_id);
CREATE INDEX IF NOT EXISTS idx_campaign_bookings_recipient ON campaign_bookings(recipient_id);

-- RLS Policies
ALTER TABLE campaign_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on campaign_bookings" ON campaign_bookings
  FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- TRIGGER: Update updated_at on modification
-- =====================================================

CREATE OR REPLACE FUNCTION update_campaign_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_campaign_bookings_updated_at
  BEFORE UPDATE ON campaign_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_bookings_updated_at();

-- =====================================================
-- TRIGGER: Update campaign_recipients status on booking
-- =====================================================

CREATE OR REPLACE FUNCTION update_recipient_on_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- When a booking is created/updated, update the campaign_recipient status
  IF NEW.recipient_id IS NOT NULL THEN
    IF NEW.status = 'confirmed' THEN
      UPDATE campaign_recipients 
      SET status = 'booked', booked_at = NEW.created_at
      WHERE id = NEW.recipient_id;
    ELSIF NEW.status = 'cancelled' THEN
      UPDATE campaign_recipients 
      SET status = 'clicked'  -- Revert to clicked (they still clicked the link)
      WHERE id = NEW.recipient_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_recipient_on_booking
  AFTER INSERT OR UPDATE ON campaign_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_recipient_on_booking();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE campaign_bookings IS 'Stores actual appointment bookings for campaign-based scheduling';
COMMENT ON COLUMN campaign_bookings.google_event_id IS 'Google Calendar event ID for sync';
COMMENT ON COLUMN campaign_bookings.soc_protocolo IS 'SOC system protocol number after successful integration';
COMMENT ON COLUMN campaign_bookings.soc_sync_status IS 'Status of SOC sync: pending, synced, error, not_applicable';
