-- restore_indexes.sql
-- Crea índices necesarios para filtros Realtime y performance general
-- Es seguro ejecutar múltiples veces (IF NOT EXISTS)

CREATE INDEX IF NOT EXISTS idx_goals_match_id ON goals(match_id);
CREATE INDEX IF NOT EXISTS idx_match_clock_match_id ON match_clock(match_id);
CREATE INDEX IF NOT EXISTS idx_mvp_votes_match_id ON mvp_votes(match_id);
CREATE INDEX IF NOT EXISTS idx_mvp_official_match_id ON mvp_official(match_id);
CREATE INDEX IF NOT EXISTS idx_goals_team_id ON goals(team_id);
CREATE INDEX IF NOT EXISTS idx_matches_tournament_id ON matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_teams_tournament_id ON teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_org_id ON tournaments(org_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- Verificación
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
