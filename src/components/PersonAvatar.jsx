import React, { useState, useEffect } from 'react'
import { api } from '../services/api'

const CARD='#ffffff', BORDER='#e9ecef', OLIVE='#243800'

// Shows a rider/driver's real uploaded profile photo, fetched via the
// authenticated /rides/avatar/:userId endpoint (plain <img src> can't send
// an auth header, so we pull it as a blob and use an object URL instead).
// Falls back to initials if there's no photo on file, or the viewer isn't
// currently matched/riding with that person (request denied).
export default function PersonAvatar({ userId, name, size = 40, fontSize = 15, radius = '50%' }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const [avatarUrl, setAvatarUrl] = useState(null)

  useEffect(() => {
    setAvatarUrl(null)
    if (!userId) return
    let objectUrl
    api.getBlob(`/rides/avatar/${userId}`)
      .then(blob => { objectUrl = URL.createObjectURL(blob); setAvatarUrl(objectUrl) })
      .catch(() => {})
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
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
