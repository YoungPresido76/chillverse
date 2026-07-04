// src/features/posts/PostBody.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../shared/lib/supabase'
import { tokenizeBody, extractMentionCandidates } from './mentionParsing'

export default function PostBody({ body }: { body: string }) {
  const navigate = useNavigate()
  const [resolvedUsernames, setResolvedUsernames] = useState<Set<string>>(new Set())
  const [idByUsername, setIdByUsername] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    const candidates = extractMentionCandidates(body)
    if (candidates.length === 0) {
      setResolvedUsernames(new Set())
      setIdByUsername(new Map())
      return
    }
    let active = true
    Promise.all(
      candidates.map(c => supabase.from('profiles').select('id, username').ilike('username', c).maybeSingle()),
    ).then(results => {
      if (!active) return
      const usernames = new Set<string>()
      const ids = new Map<string, string>()
      for (const r of results) {
        if (r.data) {
          const lower = r.data.username.toLowerCase()
          usernames.add(lower)
          ids.set(lower, r.data.id)
        }
      }
      setResolvedUsernames(usernames)
      setIdByUsername(ids)
    })
    return () => { active = false }
  }, [body])

  const tokens = tokenizeBody(body, resolvedUsernames)

  return (
    <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5, marginTop: 10, whiteSpace: 'pre-wrap' }}>
      {tokens.map((t, i) => {
        if (t.type === 'mention') {
          const uid = idByUsername.get(t.username.toLowerCase())
          return (
            <span
              key={i}
              onClick={() => uid && navigate(`/profile/${uid}`)}
              style={{ color: 'var(--accent)', fontWeight: 700, cursor: uid ? 'pointer' : 'default' }}
            >
              {t.text}
            </span>
          )
        }
        if (t.type === 'game') {
          return (
            <span
              key={i}
              onClick={() => navigate('/games', { state: { openGame: t.gameId } })}
              style={{ color: 'var(--blue)', fontWeight: 700, cursor: 'pointer' }}
            >
              {t.text}
            </span>
          )
        }
        return <span key={i}>{t.text}</span>
      })}
    </p>
  )
}
