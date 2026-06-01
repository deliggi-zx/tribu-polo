import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

type Props = { tournament: any; isAdmin: boolean }

export default function AwardsView({ tournament, isAdmin }: Props) {
  const [awardTypes, setAwardTypes] = useState<any[]>([])
  const [awards, setAwards] = useState<any[]>([])
  const [gallery, setGallery] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingAward, setEditingAward] = useState<any>(null)
  const [winnerName, setWinnerName] = useState('')
  const [winnerPhoto, setWinnerPhoto] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [innerTab, setInnerTab] = useState<'awards' | 'gallery'>('awards')

  useEffect(() => {
    loadData()
  }, [tournament.id])

  async function loadData() {
    setLoading(true)
    const [at, aw, g] = await Promise.all([
      supabase.from('award_types').select('*').eq('tournament_id', tournament.id).order('order_index'),
      supabase.from('awards').select('*').eq('tournament_id', tournament.id),
      supabase.from('gallery_photos').select('*').eq('tournament_id', tournament.id).order('created_at', { ascending: false }),
    ])
    setAwardTypes(at.data ?? [])
    setAwards(aw.data ?? [])
    setGallery(g.data ?? [])
    setLoading(false)
  }

  function getAward(awardTypeId: string) {
    return awards.find(a => a.award_type_id === awardTypeId)
  }

  async function uploadImage(file: File, path: string): Promise<string | null> {
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (error) return null
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    return data.publicUrl
  }

  async function saveAward() {
    if (!editingAward || !winnerName.trim()) return alert('Ingresá el nombre del ganador')
    setSaving(true)
    try {
      let photoUrl = getAward(editingAward.id)?.photo_url ?? null
      if (winnerPhoto) {
        photoUrl = await uploadImage(winnerPhoto, `awards/${tournament.id}_${editingAward.id}.jpg`)
      }

      const existing = getAward(editingAward.id)
      if (existing) {
        await supabase.from('awards').update({ winner_name: winnerName, photo_url: photoUrl }).eq('id', existing.id)
      } else {
        await supabase.from('awards').insert({ award_type_id: editingAward.id, tournament_id: tournament.id, winner_name: winnerName, photo_url: photoUrl })
      }

      await loadData()
      setEditingAward(null)
      setWinnerName('')
      setWinnerPhoto(null)
    } catch (e) {
      alert('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function uploadGalleryPhoto(file: File) {
    setUploadingGallery(true)
    try {
      const path = `gallery/${tournament.id}_${Date.now()}.jpg`
      const url = await uploadImage(file, path)
      if (url) {
        await supabase.from('gallery_photos').insert({ tournament_id: tournament.id, photo_url: url })
        await loadData()
      }
    } finally {
      setUploadingGallery(false)
    }
  }

  async function deleteGalleryPhoto(id: string, photoUrl: string) {
    if (!confirm('¿Eliminar esta foto?')) return
    await supabase.from('gallery_photos').delete().eq('id', id)
    const path = photoUrl.split('/avatars/')[1]
    if (path) await supabase.storage.from('avatars').remove([path])
    await loadData()
  }

  const completedAwards = awards.length
  const totalAwards = awardTypes.length

  const styles = {
    innerTab: (active: boolean) => ({
      flex: 1, padding: '10px 8px', textAlign: 'center' as const, cursor: 'pointer',
      fontWeight: 600, fontSize: 13, color: active ? '#C9A84C' : '#d4a0b0',
      background: active ? 'rgba(201,168,76,0.1)' : 'none',
      border: 'none', borderRadius: 8, margin: 2,
    }),
  }

  if (loading) return <p style={{ color: '#d4a0b0', textAlign: 'center', marginTop: 40 }}>Cargando...</p>

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', background: '#4A0B1E', borderRadius: 10, margin: '0 0 16px', padding: 4 }}>
        <button style={styles.innerTab(innerTab === 'awards')} onClick={() => setInnerTab('awards')}>
          🏆 Premios {completedAwards > 0 && `(${completedAwards}/${totalAwards})`}
        </button>
        <button style={styles.innerTab(innerTab === 'gallery')} onClick={() => setInnerTab('gallery')}>
          📷 Grandes momentos {gallery.length > 0 && `(${gallery.length})`}
        </button>
      </div>

      {innerTab === 'awards' && (
        <>
          {awardTypes.length === 0 ? (
            <div style={{ background: '#4A0B1E', borderRadius: 12, padding: 24, textAlign: 'center', border: '1px solid #8B1A3A' }}>
              <p style={{ color: '#d4a0b0', fontSize: 14 }}>No se definieron premios para este torneo.</p>
            </div>
          ) : (
            <>
              {/* Banner campeón si está cargado */}
              {getAward(awardTypes[0]?.id)?.winner_name && (
                <div style={{ background: 'linear-gradient(135deg, #4A0B1E, #8B1A3A)', borderRadius: 16, padding: 24, marginBottom: 20, textAlign: 'center', border: '2px solid #C9A84C' }}>
                  <p style={{ color: '#C9A84C', fontSize: 12, fontWeight: 700, letterSpacing: 2, margin: '0 0 8px' }}>🏆 CAMPEÓN</p>
                  {getAward(awardTypes[0].id)?.photo_url && (
                    <img src={getAward(awardTypes[0].id).photo_url} alt="Campeón"
                      style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '3px solid #C9A84C', marginBottom: 12, cursor: 'pointer' }}
                      onClick={() => setLightbox(getAward(awardTypes[0].id).photo_url)} />
                  )}
                  <p style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: 0, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                    {getAward(awardTypes[0].id).winner_name}
                  </p>
                </div>
              )}

              {/* Lista de premios */}
              {awardTypes.map((awardType, i) => {
                const award = getAward(awardType.id)
                const isChampion = i === 0
                if (isChampion && award?.winner_name) return null // ya se muestra arriba

                return (
                  <div key={awardType.id} style={{ background: '#4A0B1E', borderRadius: 12, padding: 16, marginBottom: 10, border: '1px solid #8B1A3A', display: 'flex', alignItems: 'center', gap: 12 }}>
                    {award?.photo_url ? (
                      <img src={award.photo_url} alt={award.winner_name}
                        style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid #C9A84C', cursor: 'pointer', flexShrink: 0 }}
                        onClick={() => setLightbox(award.photo_url)} />
                    ) : (
                      <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#6B0F2B', border: '2px dashed #8B1A3A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 24 }}>🏆</span>
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <p style={{ color: '#C9A84C', fontSize: 11, fontWeight: 700, letterSpacing: 1, margin: '0 0 2px' }}>{awardType.name.toUpperCase()}</p>
                      <p style={{ color: award?.winner_name ? '#fff' : '#d4a0b0', fontSize: 16, fontWeight: award?.winner_name ? 700 : 400, margin: 0 }}>
                        {award?.winner_name ?? 'Sin asignar'}
                      </p>
                    </div>
                    {isAdmin && (
                      <button onClick={() => { setEditingAward(awardType); setWinnerName(award?.winner_name ?? ''); setWinnerPhoto(null) }}
                        style={{ background: '#8B1A3A', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#fff', cursor: 'pointer', fontSize: 12, flexShrink: 0 }}>
                        {award?.winner_name ? '✏️' : '+ Cargar'}
                      </button>
                    )}
                  </div>
                )
              })}
            </>
          )}

          {/* Modal edición premio */}
          {editingAward && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
              <div style={{ background: '#4A0B1E', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, border: '1px solid #8B1A3A' }}>
                <p style={{ color: '#C9A84C', fontWeight: 700, fontSize: 16, marginBottom: 16 }}>🏆 {editingAward.name}</p>

                {winnerPhoto ? (
                  <img src={URL.createObjectURL(winnerPhoto)} alt="preview"
                    style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid #C9A84C', marginBottom: 12, display: 'block' }} />
                ) : getAward(editingAward.id)?.photo_url ? (
                  <img src={getAward(editingAward.id).photo_url} alt="actual"
                    style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid #8B1A3A', marginBottom: 12, display: 'block' }} />
                ) : null}

                <label style={{ color: '#d4a0b0', fontSize: 12, display: 'block', marginBottom: 4 }}>Nombre del ganador</label>
                <input value={winnerName} onChange={e => setWinnerName(e.target.value)}
                  style={{ width: '100%', background: '#6B0F2B', border: '1px solid #8B1A3A', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 15, boxSizing: 'border-box' as const, marginBottom: 12 }}
                  placeholder="Nombre..." />

                <label style={{ color: '#d4a0b0', fontSize: 12, display: 'block', marginBottom: 8 }}>Foto (opcional)</label>
                <input type="file" accept="image/*" style={{ color: '#d4a0b0', fontSize: 12, marginBottom: 16 }}
                  onChange={e => setWinnerPhoto(e.target.files?.[0] ?? null)} />

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setEditingAward(null); setWinnerName(''); setWinnerPhoto(null) }}
                    style={{ flex: 1, background: '#8B1A3A', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', cursor: 'pointer', fontWeight: 700 }}>
                    Cancelar
                  </button>
                  <button onClick={saveAward} disabled={saving}
                    style={{ flex: 1, background: '#C9A84C', color: '#4A0B1E', border: 'none', borderRadius: 10, padding: '12px', cursor: 'pointer', fontWeight: 700 }}>
                    {saving ? 'Guardando...' : '✓ Guardar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {innerTab === 'gallery' && (
        <>
          {isAdmin && (
            <div style={{ background: '#4A0B1E', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid #8B1A3A', textAlign: 'center' }}>
              <p style={{ color: '#d4a0b0', fontSize: 13, marginBottom: 8 }}>Subir fotos de la jornada</p>
              <input type="file" accept="image/*" multiple style={{ color: '#d4a0b0', fontSize: 12, marginBottom: 8 }}
                onChange={async e => {
                  const files = Array.from(e.target.files ?? [])
                  for (const file of files) await uploadGalleryPhoto(file)
                  e.target.value = ''
                }} />
              {uploadingGallery && <p style={{ color: '#C9A84C', fontSize: 12 }}>Subiendo...</p>}
            </div>
          )}

          {gallery.length === 0 ? (
            <div style={{ background: '#4A0B1E', borderRadius: 12, padding: 24, textAlign: 'center', border: '1px solid #8B1A3A' }}>
              <p style={{ color: '#d4a0b0', fontSize: 14 }}>No hay fotos todavía.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
              {gallery.map(photo => (
                <div key={photo.id} style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden', borderRadius: 8 }}>
                  <img src={photo.photo_url} alt="galería"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                    onClick={() => setLightbox(photo.photo_url)} />
                  {isAdmin && (
                    <button onClick={() => deleteGalleryPhoto(photo.id, photo.photo_url)}
                      style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 24, height: 24, color: '#fff', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}
          onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="foto" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 12, objectFit: 'contain' }} />
        </div>
      )}
    </div>
  )
}
