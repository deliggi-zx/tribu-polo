import { useState } from 'react'
import { supabase } from '../lib/supabase'

type Props = { onCreated: (t: any) => void }

const emptyTeam = () => ({ name: '', handicap: 0, group: 'A', players: ['', '', '', ''] })

export default function TournamentSetup({ onCreated }: Props) {
  const [name, setName] = useState('Tribu Polo 2026')
  const [date, setDate] = useState('')
  const [chukkers, setChukkers] = useState(4)
  const [teamCount, setTeamCount] = useState(8)
  const [teams, setTeams] = useState(() => Array.from({ length: 8 }, (_, i) => ({ ...emptyTeam(), group: i < 4 ? 'A' : 'B' })))
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState<'config' | 'teams'>('config')

  function updateTeam(i: number, field: string, value: any) {
    setTeams(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t))
  }

  function updatePlayer(teamIdx: number, playerIdx: number, value: string) {
    setTeams(prev => prev.map((t, i) => i === teamIdx
      ? { ...t, players: t.players.map((p, j) => j === playerIdx ? value : p) }
      : t
    ))
  }

  function addPlayer(teamIdx: number) {
    setTeams(prev => prev.map((t, i) => i === teamIdx ? { ...t, players: [...t.players, ''] } : t))
  }

  async function handleCreate() {
    if (!name || !date) return alert('Completá nombre y fecha')
    setSaving(true)
    try {
      const { data: tournament } = await supabase
        .from('tournaments')
        .insert({ name, date, chukkers_per_match: chukkers, status: 'setup' })
        .select().single()

      const activeTeams = teams.slice(0, teamCount)
      for (const team of activeTeams) {
        const { data: savedTeam } = await supabase
          .from('teams')
          .insert({ tournament_id: tournament.id, name: team.name, handicap: team.handicap, group_name: team.group })
          .select().single()

        const validPlayers = team.players.filter(p => p.trim())
        if (validPlayers.length > 0) {
          await supabase.from('players').insert(
            validPlayers.map(p => ({ team_id: savedTeam.id, name: p }))
          )
        }
      }

      // Generar fixture fase de grupos
      await generateGroupFixture(tournament.id, activeTeams)
      onCreated(tournament)
    } catch (e) {
      alert('Error al crear el torneo')
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  async function generateGroupFixture(tournamentId: string, _activeTeams: any[]) {
    const groups = ['A', 'B']
    for (const group of groups) {
      
      // Obtener IDs reales
      const { data: savedTeams } = await supabase
        .from('teams')
        .select('id, name, group_name')
        .eq('tournament_id', tournamentId)
        .eq('group_name', group)

      if (!savedTeams) continue
      // Todos contra todos dentro del grupo
      for (let i = 0; i < savedTeams.length; i++) {
        for (let j = i + 1; j < savedTeams.length; j++) {
          await supabase.from('matches').insert({
            tournament_id: tournamentId,
            team_home_id: savedTeams[i].id,
            team_away_id: savedTeams[j].id,
            stage: 'group',
            group_name: group,
            status: 'pending'
          })
        }
      }
    }
  }

  const styles = {
    container: { minHeight: '100vh', background: '#0f172a', color: '#fff', padding: '24px 16px' },
    title: { fontSize: 28, fontWeight: 800, color: '#f8d000', textAlign: 'center' as const, marginBottom: 8 },
    sub: { textAlign: 'center' as const, color: '#94a3b8', marginBottom: 32 },
    card: { background: '#1e293b', borderRadius: 16, padding: 24, marginBottom: 16, maxWidth: 600, margin: '0 auto 16px' },
    label: { fontSize: 13, color: '#94a3b8', marginBottom: 6, display: 'block' },
    input: { width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 15, boxSizing: 'border-box' as const },
    btn: { background: '#f8d000', color: '#0f172a', fontWeight: 700, fontSize: 16, border: 'none', borderRadius: 10, padding: '14px 24px', cursor: 'pointer', width: '100%', marginTop: 16 },
    btnSm: { background: '#334155', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13, marginTop: 8 },
    teamCard: { background: '#0f172a', borderRadius: 12, padding: 16, marginBottom: 12 },
    row: { display: 'flex', gap: 12, alignItems: 'center' },
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🐴 TRIBU POLO</h1>
      <p style={styles.sub}>Configuración del torneo</p>

      {step === 'config' && (
        <div style={styles.card}>
          <label style={styles.label}>Nombre del torneo</label>
          <input style={styles.input} value={name} onChange={e => setName(e.target.value)} />

          <label style={{ ...styles.label, marginTop: 16 }}>Fecha</label>
          <input style={styles.input} type="date" value={date} onChange={e => setDate(e.target.value)} />

          <label style={{ ...styles.label, marginTop: 16 }}>Chukkers por partido</label>
          <input style={styles.input} type="number" min={1} max={8} value={chukkers} onChange={e => setChukkers(Number(e.target.value))} />

          <label style={{ ...styles.label, marginTop: 16 }}>Cantidad de equipos</label>
          <div style={styles.row}>
            {[4, 8].map(n => (
              <button key={n} onClick={() => { setTeamCount(n); setTeams(Array.from({ length: n }, (_, i) => ({ ...emptyTeam(), group: i < n / 2 ? 'A' : 'B' }))) }}
                style={{ ...styles.btnSm, background: teamCount === n ? '#f8d000' : '#334155', color: teamCount === n ? '#0f172a' : '#fff', flex: 1 }}>
                {n} equipos
              </button>
            ))}
          </div>

          <button style={styles.btn} onClick={() => setStep('teams')}>Siguiente → Cargar equipos</button>
        </div>
      )}

      {step === 'teams' && (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          {teams.slice(0, teamCount).map((team, i) => (
            <div key={i} style={styles.teamCard}>
              <div style={{ ...styles.row, marginBottom: 12 }}>
                <span style={{ color: '#f8d000', fontWeight: 700, fontSize: 13 }}>GRUPO {team.group}</span>
                <span style={{ color: '#94a3b8', fontSize: 13 }}>Equipo {i + 1}</span>
              </div>
              <input style={{ ...styles.input, marginBottom: 8 }} placeholder="Nombre del equipo" value={team.name} onChange={e => updateTeam(i, 'name', e.target.value)} />
              <input style={styles.input} type="number" placeholder="Handicap del equipo" value={team.handicap} onChange={e => updateTeam(i, 'handicap', Number(e.target.value))} />
              <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 12, marginBottom: 8 }}>Jugadores:</p>
              {team.players.map((player, j) => (
                <input key={j} style={{ ...styles.input, marginBottom: 6 }} placeholder={`Jugador ${j + 1}`} value={player} onChange={e => updatePlayer(i, j, e.target.value)} />
              ))}
              <button style={styles.btnSm} onClick={() => addPlayer(i)}>+ Agregar jugador</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 12 }}>
            <button style={{ ...styles.btn, background: '#334155', color: '#fff' }} onClick={() => setStep('config')}>← Volver</button>
            <button style={styles.btn} onClick={handleCreate} disabled={saving}>
              {saving ? 'Creando...' : '🏆 Crear torneo'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}