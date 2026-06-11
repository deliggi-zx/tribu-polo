-- restore_rls.sql
-- Deshabilita RLS en todas las tablas de Go Polo
-- Ejecutar en Supabase SQL Editor si el Realtime deja de funcionar
-- o si usuarios no autenticados no pueden leer datos

ALTER TABLE award_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE awards DISABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE match_clock DISABLE ROW LEVEL SECURITY;
ALTER TABLE matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE mvp_official DISABLE ROW LEVEL SECURITY;
ALTER TABLE mvp_votes DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE players DISABLE ROW LEVEL SECURITY;
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_visits DISABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments DISABLE ROW LEVEL SECURITY;

-- Verificación: todas deben mostrar false
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
