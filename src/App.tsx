import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import TournamentSetup from './pages/TournamentSetup'
import TournamentView from './pages/TournamentView'
import './App.css'

export default function App() {
  const [tournament, setTournament] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [initialMatchId, setInitialMatchId] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const matchId = params.get('match')
    if (matchId) setInitialMatchId(matchId)
    loadActiveTournament()
  }, [])

  async function loadActiveTournament() {
    const { data } = await supabase
      .from('tournaments')
      .select('*')
      .neq('status', 'finished')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    setTournament(data)
    setLoading(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a' }}>
      <p style={{ color: '#fff', fontSize: 18 }}>Cargando...</p>
    </div>
  )

  return (
    <div>
      {!tournament
        ? <TournamentSetup onCreated={setTournament} />
        : <TournamentView tournament={tournament} onReset={() => setTournament(null)} initialMatchId={initialMatchId} />
      }
    </div>
  )
}