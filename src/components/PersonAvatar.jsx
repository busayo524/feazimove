import React, { useState, useEffect } from 'react'
import { api } from '../services/api'
import { cachedAvatar, rememberAvatar, isFreshThisSession, blobToDataUrl, dedupeFetch } from '../utils/avatarCache'

const NEON='#ccff00', BORDER='#e9ecef', OLIVE='#243800'

// Shows a rider/driver's real uploaded profile photo, fetched via the
// authenticated /rides/avatar/:userId endpoint (plain <img src> can't send
// an auth header, so we pull it as a blob and use an object URL instead).
// Falls back to initials if there's no photo on file, or the viewer isn't
// currently matched/riding with that person (request denied).
export default function PersonAvatar({ userId, name, size = 40, fontSize = 15, radius = '50%' }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const [avatarUrl, setAvatarUrl] = useState(null)

  useEffect(() => {
    // Other people's photos are cached in memory only (not localStorage) —
    // instant while navigating, but not persisted on this device.
    const key = `feazi_ride_avatar_${userId}`
    const cached = userId ? cachedAvatar(key) : null
    setAvatarUrl(cached)
    if (!userId || (cached && isFreshThisSession(key))) return
    let alive = true
    dedupeFetch(key, () => api.getBlob(`/rides/avatar/${userId}`).then(blobToDataUrl))
      .then(dataUrl => { rememberAvatar(key, dataUrl, { persist: false }); if (alive) setAvatarUrl(dataUrl) })
      .catch(() => {})
    return () => { alive = false }
  }, [userId])

  return (
    <div style={{ width:size, height:size, borderRadius:radius, background:NEON, border:`1.5px solid ${BORDER}`, display:'flex',
      alignItems:'center', justifyContent:'center', flexShrink:0, overflow:'hidden' }}>
      {avatarUrl
        ? <img src={avatarUrl} alt={name} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
        : <span style={{ fontWeight:800, fontSize, color:OLIVE }}>{initials}</span>
      }
    </div>
  )
}
