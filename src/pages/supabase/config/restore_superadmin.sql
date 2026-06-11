-- restore_superadmin.sql
-- Restaura el rol superadmin en app_metadata
-- Reemplazar 'superadmin@gopolo.app' con el email real del superadmin

UPDATE auth.users 
SET raw_app_meta_data = raw_app_meta_data || '{"role": "superadmin"}'::jsonb
WHERE email = 'superadmin@gopolo.app';

-- Verificación
SELECT email, raw_app_meta_data 
FROM auth.users 
WHERE raw_app_meta_data->>'role' = 'superadmin';
