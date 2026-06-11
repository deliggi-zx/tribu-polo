-- restore_realtime.sql
-- Agrega las tablas críticas a la publicación supabase_realtime
-- Ejecutar si el Realtime deja de recibir eventos
-- Nota: si una tabla ya está en la publicación dará error "already member" — es normal, ignorar

ALTER PUBLICATION supabase_realtime ADD TABLE goals;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE match_clock;
ALTER PUBLICATION supabase_realtime ADD TABLE mvp_official;
ALTER PUBLICATION supabase_realtime ADD TABLE mvp_votes;

-- Verificación: deben aparecer las 5 tablas
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
