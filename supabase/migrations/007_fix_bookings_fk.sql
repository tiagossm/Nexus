-- Clean up orphans
DELETE FROM bookings 
WHERE event_id IS NOT NULL 
AND event_id NOT IN (SELECT id FROM events);

-- Fix missing FK on bookings
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'bookings_event_id_fkey'
    ) THEN
        ALTER TABLE bookings 
        ADD CONSTRAINT bookings_event_id_fkey 
        FOREIGN KEY (event_id) 
        REFERENCES events(id) 
        ON DELETE CASCADE;
    END IF;
END $$;
