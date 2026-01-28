-- Profile'ı superadmin yap
UPDATE profiles 
SET system_role = 'superadmin', 
    full_name = 'Super Admin',
    is_active = true
WHERE email = 'admin@e-menum.com';

-- Email'i confirm et (eğer değilse)
UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email = 'admin@e-menum.com';

-- Kontrol et
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