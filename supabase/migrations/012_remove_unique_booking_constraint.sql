-- Remove unique constraint to allow multiple bookings per slot (Capacity > 1)
ALTER TABLE campaign_bookings
DROP CONSTRAINT IF EXISTS campaign_bookings_campaign_id_start_time_key;
