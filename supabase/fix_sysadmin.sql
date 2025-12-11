-- Fix sysadmin approval status
-- Run this in Supabase SQL Editor

UPDATE profiles 
SET 
    is_approved = true,
    is_active = true,
    role = 'super_admin',
    approved_at = NOW()
WHERE email = 'eng.tiagosm@gmail.com';

-- Verify the update
SELECT id, email, full_name, role, is_approved, is_active FROM profiles WHERE email = 'eng.tiagosm@gmail.com';
