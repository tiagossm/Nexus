-- Create indexes for unindexed foreign keys to improve query performance
CREATE INDEX IF NOT EXISTS idx_campaign_bookings_contact_id ON public.campaign_bookings(contact_id);
CREATE INDEX IF NOT EXISTS idx_campaign_bookings_recipient_id ON public.campaign_bookings(recipient_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_clinic_id ON public.campaigns(clinic_id);

-- Drop duplicate index on bookings table
-- idx_bookings_client_email and idx_bookings_email are identical
DROP INDEX IF EXISTS idx_bookings_client_email;
