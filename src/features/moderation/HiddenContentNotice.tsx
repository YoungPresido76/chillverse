// src/features/moderation/HiddenContentNotice.tsx
import { AlertTriangle } from 'lucide-react'

/**
 * Shown only to the author of hidden content (everyone else never receives
 * this row at all — see the RLS policies added in migrations 0030/0031).
 * The wording comes from the DB (`hidden_reason`) rather than being
 * hardcoded here, since different triggers explain themselves differently:
 * "pending review after multiple reports" vs. "violates our Terms and
 * Conditions" read very differently and shouldn't share one string.
 */
export default function HiddenContentNotice({ reason, inline = false }: { reason: string | null; inline?: boolean }) {
  const text = reason ?? 'This content is hidden pending moderator review.'
  return (
    <span style={{
      display: inline ? 'inline-flex' : 'flex',
      alignItems: 'flex-start', gap: 6, fontStyle: 'italic', color: '#ff9a3c', fontSize: 'inherit', lineHeight: 1.4,
    }}>
      <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 2 }} />
      {text}
    </span>
  )
}
