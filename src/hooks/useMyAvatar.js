import { useState, useEffect } from 'react'
import { api } from '../services/api'

// Shows the current user's own profile photo. Starts from the localStorage
// copy (if this browser was the one that captured it) for an instant paint,
// then upgrades to the server-side copy via the authenticated /auth/avatar
// endpoint so the photo also shows up on other devices/browsers. Falls back
// to initials (returns null) if neither exists.
export function useMyAvatar(userId) {
  const [avatarUrl, setAvatarUrl] = useState(() => userId ? localStorage.getItem(`feazi_avatar_${userId}`) : null)

  useEffect(() => {
    setAvatarUrl(userId ? localStorage.getItem(`feazi_avatar_${userId}`) : null)
    if (!userId) return
    let objectUrl
    api.getBlob('/auth/avatar')
      .then(blob => { objectUrl = URL.createObjectURL(blob); setAvatarUrl(objectUrl) })
      .catch(() => {})
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [userId])

  return [avatarUrl, setAvatarUrl]
}
