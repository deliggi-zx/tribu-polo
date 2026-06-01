import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { QRCodeSVG } from 'qrcode.react'

type Props = { match: any; tournament: any; onBack: () => void; isAdmin: boolean }

export default function MatchView({ match, tournament, onBack, isAdmin }: Props) {
  const [goals, setGoals] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [mvpVotes, setMvpVotes] = useState<any[]>([])
  const [mvpOfficial, setMvpOfficial] = useState<any>(null)
  const [chukker, setChukker] = useState(match.chukker_current ?? 1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const deviceId = (() => {
    let id = localStorage.getItem('tribu_device_id')
    if (!id) {
      id = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
      localStorage.setItem('tribu_device_id', id)
    }
    return id
  })()

  useEffect(() => {
    loadData()

    const channel = supabase
      .channel(`match-${match.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goals', filter: `match_id=eq.${match.id}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mvp_votes', filter: `match_id=eq.${match.id}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mvp_official', filter: `match_id=eq.${match.id}` }, () => loadData())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [match.id])

  async function loadData() {
    setLoading(true)
    const [g, p, v, m] = await Promise.all([
      supabase.from('goals').select('*, player:players(*)').eq('match_id', match.id).order('created_at'),
      supabase.from('players').select('*').in('team_id', [match.team_home_id, match.team_away_id]),
      supabase.from('mvp_votes').select('id, player_id, device_id, player:players(*)').eq('match_id', match.id),
      supabase.from('mvp_official').select('*, player:players(*)').eq('match_id', match.id).single(),
    ])
    setGoals(g.data ?? [])
    setPlayers(p.data ?? [])
    setMvpVotes(v.data ?? [])
    setMvpOfficial(m.data)
    setLoading(false)
  }

  const homeGoals = goals.filter(g => g.team_id === match.team_home_id).length
  const awayGoals = goals.filter(g => g.team_id === match.team_away_id).length
  const hasVoted = mvpVotes.some(v => v.device_id === deviceId) || localStorage.getItem(`voted_match_${match.id}`) === 'true'

  async function addGoal(playerId: string, teamId: string) {
    setSaving(true)
    await supabase.from('goals').insert({ match_id: match.id, player_id: playerId, team_id: teamId, chukker })
    await supabase.from('matches').update({ status: 'live', chukker_current: chukker }).eq('id', match.id)
    await loadData()
    setSaving(false)
  }

  async function removeLastGoal() {
    const lastGoal = goals[goals.length - 1]
    if (!lastGoal) return
    await supabase.from('goals').delete().eq('id', lastGoal.id)
    await loadData()
  }

  async function finishMatch() {
    await supabase.from('matches').update({ status: 'finished', played_at: new Date().toISOString() }).eq('id', match.id)
    onBack()
  }

  async function votePlayer(playerId: string) {
    if (hasVoted) return
    await supabase.from('mvp_votes').insert({ match_id: match.id, player_id: playerId, device_id: deviceId })
    localStorage.setItem(`voted_match_${match.id}`, 'true')
    await loadData()
  }

  async function setOfficialMvp(playerId: string) {
    await supabase.from('mvp_official').upsert({ match_id: match.id, player_id: playerId })
    await loadData()
  }

  function getMvpVoteCount(playerId: string) {
    return mvpVotes.filter(v => v.player_id === playerId).length
  }

  const allPlayers = players

  const styles = {
    container: { minHeight: '100vh', background: '#6B0F2B', color: '#fff' },
    header: { background: '#4A0B1E', padding: '16px', borderBottom: '1px solid #8B1A3A' },
    backBtn: { background: 'none', border: 'none', color: '#d4a0b0', cursor: 'pointer', fontSize: 15, marginBottom: 12, padding: 0 },
    scoreboard: { background: '#4A0B1E', borderRadius: 16, padding: 20, margin: 16, border: '1px solid #8B1A3A', textAlign: 'center' as const },
    score: { fontSize: 56, fontWeight: 800, color: '#C9A84C' },
    teamName: { fontSize: 16, fontWeight: 600, color: '#fff' },
    chukkerBadge: { display: 'inline-block', background: '#dc2626', color: '#fff', borderRadius: 20, padding: '4px 12px', fontSize: 13, fontWeight: 700, marginTop: 8 },
    section: { padding: '0 16px 16px' },
    sectionTitle: { color: '#d4a0b0', fontSize: 12, fontWeight: 700, letterSpacing: 1, marginBottom: 12, marginTop: 16 },
    btn: (color: string) => ({ background: color, color: color === '#C9A84C' ? '#4A0B1E' : '#fff', border: 'none', borderRadius: 10, padding: '12px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 14, flex: 1 }),
    playerBtn: (active: boolean) => ({ background: active ? '#8B1A3A' : '#4A0B1E', border: active ? '1px solid #C9A84C' : '1px solid #8B1A3A', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', color: '#fff', fontSize: 14, textAlign: 'left' as const, width: '100%', marginBottom: 6 }),
    goalRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #5A1525' },
    input: { background: '#4A0B1E', border: '1px solid #8B1A3A', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 15, width: 60, textAlign: 'center' as const },
  }

  if (loading) return <div style={{ ...styles.container, display: 'flex', justifyContent: 'center', alignItems: 'center' }}><p style={{ color: '#fff' }}>Cargando...</p></div>

  const qrUrl = `${window.location.origin}/?match=${match.id}`

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>← Volver al fixture</button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#94a3b8', fontSize: 13 }}>
            {match.stage === 'group' ? `Grupo ${match.group_name}` : match.stage === 'semi' ? 'Semifinal' : 'Final'}
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: match.status === 'finished' ? '#166534' : match.status === 'live' ? '#dc2626' : '#334155', color: '#fff' }}>
              {match.status === 'finished' ? 'Finalizado' : match.status === 'live' ? '🔴 En vivo' : 'Pendiente'}
            </span>
            <button onClick={() => setShowQR(!showQR)} style={{ background: '#334155', border: 'none', borderRadius: 8, padding: '4px 10px', color: '#fff', cursor: 'pointer', fontSize: 12 }}>
              {showQR ? 'Cerrar QR' : '📱 QR'}
            </button>
          </div>
        </div>
      </div>

      {showQR && (
        <div style={{ background: '#1e293b', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, borderBottom: '1px solid #334155' }}>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>Escaneá para votar al jugador destacado</p>
          <div style={{ background: '#fff', padding: 12, borderRadius: 12 }}>
            <QRCodeSVG value={qrUrl} size={180} />
          </div>
          <p style={{ color: '#475569', fontSize: 11, margin: 0 }}>{qrUrl}</p>
        </div>
      )}

      {/* Marcador */}
      <div style={styles.scoreboard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: 1, textAlign: 'right' as const }}>
            <p style={styles.teamName}>{match.team_home?.name}</p>
            <p style={{ color: '#94a3b8', fontSize: 12 }}>H: {match.team_home?.handicap ?? 0}</p>
          </div>
          <div style={{ padding: '0 20px' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={styles.score}>{homeGoals}</span>
              <span style={{ color: '#334155', fontSize: 32 }}>-</span>
              <span style={styles.score}>{awayGoals}</span>
            </div>
            {match.status === 'live' && <div style={styles.chukkerBadge}>Chukker {chukker}</div>}
          </div>
          <div style={{ flex: 1, textAlign: 'left' as const }}>
            <p style={styles.teamName}>{match.team_away?.name}</p>
            <p style={{ color: '#94a3b8', fontSize: 12 }}>H: {match.team_away?.handicap ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Registro de goles - solo admin */}
      {isAdmin && match.status !== 'finished' && (
        <div style={styles.section}>
          <p style={styles.sectionTitle}>REGISTRAR GOL</p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ color: '#94a3b8', fontSize: 14 }}>Chukker:</span>
            <input style={styles.input} type="number" min={1} max={tournament.chukkers_per_match} value={chukker} onChange={e => setChukker(Number(e.target.value))} />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <p style={{ color: '#C9A84C', fontWeight: 700, fontSize: 13, marginBottom: 8, textAlign: 'center' }}>{match.team_home?.name}</p>
              {players.filter(p => p.team_id === match.team_home_id).map(player => (
                <button key={player.id} style={styles.playerBtn(false)} onClick={() => addGoal(player.id, match.team_home_id)} disabled={saving}>
                   {player.name}
                </button>
              ))}
            </div>
            <div style={{ width: 1, background: '#8B1A3A' }} />
            <div style={{ flex: 1 }}>
              <p style={{ color: '#C9A84C', fontWeight: 700, fontSize: 13, marginBottom: 8, textAlign: 'center' }}>{match.team_away?.name}</p>
              {players.filter(p => p.team_id === match.team_away_id).map(player => (
                <button key={player.id} style={styles.playerBtn(false)} onClick={() => addGoal(player.id, match.team_away_id)} disabled={saving}>
                   {player.name}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {goals.length > 0 && (
              <button style={styles.btn('#334155')} onClick={removeLastGoal}>↩ Deshacer último gol</button>
            )}
            <button style={styles.btn('#166534')} onClick={finishMatch}>✓ Finalizar partido</button>
          </div>
        </div>
      )}

      {/* Historial de goles */}
      {goals.length > 0 && (
        <div style={styles.section}>
          <p style={styles.sectionTitle}>GOLES</p>
          {goals.map((g, i) => (
            <div key={g.id} style={styles.goalRow}>
              <span style={{ color: '#94a3b8', fontSize: 12 }}>#{i + 1} Ch.{g.chukker}</span>
              <span style={{ fontWeight: 600 }}>{g.player?.name ?? 'Desconocido'}</span>
              <span style={{ color: '#94a3b8', fontSize: 12 }}>{g.team_id === match.team_home_id ? match.team_home?.name : match.team_away?.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* MVP */}
      <div style={styles.section}>
        <p style={styles.sectionTitle}>JUGADOR DESTACADO</p>
        {mvpOfficial ? (
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 16, textAlign: 'center' }}>
            <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>Destacado oficial</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#f8d000' }}>⭐ {mvpOfficial.player?.name}</p>
          </div>
        ) : (
          <>
            {!hasVoted ? (
              <>
                <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>Votá al jugador destacado del partido:</p>
                {allPlayers.map(player => (
                  <button key={player.id} style={styles.playerBtn(false)} onClick={() => votePlayer(player.id)}>
                    ⭐ {player.name} <span style={{ color: '#94a3b8', fontSize: 12 }}>({getMvpVoteCount(player.id)} votos)</span>
                  </button>
                ))}
              </>
            ) : (
              <div style={{ background: '#1e293b', borderRadius: 12, padding: 16 }}>
                <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>Votos actuales:</p>
                {allPlayers.sort((a, b) => getMvpVoteCount(b.id) - getMvpVoteCount(a.id)).map(player => (
                  <div key={player.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #334155' }}>
                    <span>{player.name}</span>
                    <span style={{ color: '#f8d000', fontWeight: 700 }}>{getMvpVoteCount(player.id)} votos</span>
                  </div>
                ))}
              </div>
            )}
            {isAdmin && (
              <>
                <p style={{ ...styles.sectionTitle, marginTop: 16 }}>CONFIRMAR DESTACADO OFICIAL</p>
                {allPlayers.map(player => (
                  <button key={player.id} style={styles.playerBtn(false)} onClick={() => setOfficialMvp(player.id)}>
                    ✓ {player.name} ({getMvpVoteCount(player.id)} votos)
                  </button>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
