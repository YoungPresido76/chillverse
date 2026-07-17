// src/features/profile/ProfileRedirect.tsx
//
// Profile is no longer a standalone page — it's the Discord-style popup
// (see ProfilePreviewModal.tsx) that lives in the global ProfilePreview
// context. This tiny route component is what `/profile` and
// `/profile/:userId` now resolve to: it opens that popup for the right
// person (yourself, or `:userId`) and immediately steps back off the URL,
// so every existing `navigate('/profile')` / `navigate('/profile/123')`
// call site across the app keeps working without being touched — they
// just get a popup instead of a page now.
import { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { useProfilePreview } from '../../context/ProfilePreview'

export default function ProfileRedirect() {
  const { userId: paramId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { openProfilePreview } = useProfilePreview()
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true

    const targetId = paramId || user?.id
    if (targetId) openProfilePreview(targetId)

    // Bounce straight back off this URL — landing on /profile should never
    // leave a page behind, just the popup on top of wherever you were.
    if (window.history.length > 2) navigate(-1)
    else navigate('/dashboard', { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
