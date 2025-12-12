-- Migration: Add access codes to campaign_bookings for public management
-- Allows users to manage their bookings without login

-- =====================================================
-- ADD ACCESS CODE COLUMN
-- =====================================================

-- Add access_code column for public access links
ALTER TABLE campaign_bookings 
ADD COLUMN IF NOT EXISTS access_code TEXT UNIQUE;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_campaign_bookings_access_code 
ON campaign_bookings(access_code);

-- =====================================================
-- FUNCTION: Generate unique access code
-- =====================================================

CREATE OR REPLACE FUNCTION generate_booking_access_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate 16-character hex code
  NEW.access_code := encode(gen_random_bytes(8), 'hex');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER: Auto-generate access code on insert
-- =====================================================

DROP TRIGGER IF EXISTS trigger_generate_access_code ON campaign_bookings;

CREATE TRIGGER trigger_generate_access_code
  BEFORE INSERT ON campaign_bookings
  FOR EACH ROW
  WHEN (NEW.access_code IS NULL)
  EXECUTE FUNCTION generate_booking_access_code();

-- =====================================================
-- BACKFILL: Generate codes for existing bookings
-- =====================================================

UPDATE campaign_bookings 
SET access_code = encode(gen_random_bytes(8), 'hex')
WHERE access_code IS NULL;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN campaign_bookings.access_code IS 'Unique code for public booking management without login';
