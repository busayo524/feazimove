import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { cachedAvatar, rememberAvatar, isFreshThisSession, blobToDataUrl } from '../utils/avatarCache'

// Shows the current user's own profile photo. Paints instantly from the
// cache (memory this session, localStorage across visits), and downloads
// from the server only once per session — the first login on a new device
// shows initials briefly, every page after that is instant.
export function useMyAvatar(userId) {
  const key = userId ? `feazi_avatar_${userId}` : null
  const [avatarUrl, setAvatarUrl] = useState(() => key ? cachedAvatar(key) : null)

  useEffect(() => {
    const cached = key ? cachedAvatar(key) : null
    setAvatarUrl(cached)
    if (!userId) return
    if (cached && isFreshThisSession(key)) return // already refreshed since login
    let alive = true
    api.getBlob('/auth/avatar')
      .then(blobToDataUrl)
      .then(dataUrl => { rememberAvatar(key, dataUrl); if (alive) setAvatarUrl(dataUrl) })
      .catch(() => {})
    return () => { alive = false }
  }, [userId])

  return [avatarUrl, setAvatarUrl]
}
