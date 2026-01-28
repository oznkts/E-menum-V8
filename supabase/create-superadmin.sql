-- =====================================================
-- Create Superadmin User
-- =====================================================
-- This SQL script creates a superadmin user in Supabase.
-- Run this in Supabase SQL Editor after creating the user in Authentication > Users
--
-- Steps:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add user" > "Create new user"
-- 3. Email: admin@e-menum.com
-- 4. Password: Admin123!
-- 5. Check "Auto Confirm User"
-- 6. Click "Create user"
-- 7. Copy the user ID from the users table
-- 8. Run this SQL script with the user ID
-- =====================================================

-- Option 1: If you know the user ID (replace 'USER_ID_HERE' with actual ID)
-- UPDATE profiles 
-- SET system_role = 'superadmin', 
--     full_name = 'Super Admin',
--     is_active = true
-- WHERE id = 'USER_ID_HERE';

-- Option 2: If you know the email (easier)
UPDATE profiles 
SET system_role = 'superadmin', 
    full_name = 'Super Admin',
    is_active = true
WHERE email = 'admin@e-menum.com';

-- Also ensure email is confirmed in auth.users
UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email = 'admin@e-menum.com';

-- Verify the update
SELECT 
    u.id,
    u.email,
    u.email_confirmed_at,
    p.full_name,
    p.system_role,
    p.is_active
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE u.email = 'admin@e-menum.com';

