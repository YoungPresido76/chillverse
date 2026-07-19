// src/features/chat/calling/StartCallButton.tsx
import { Phone } from 'lucide-react'
import { useCall } from './CallContext'
import type { CallParticipant } from './types'

interface StartCallButtonProps {
  roomId: string
  callee: CallParticipant
  size?: number
}

/** Drop into a DM conversation header. Disabled (rather than hidden) while any
 *  call is already active, so it doesn't silently do nothing on tap. */
export default function StartCallButton({ roomId, callee, size = 36 }: StartCallButtonProps) {
  const { phase, startCall } = useCall()
  const busy = phase !== 'idle'

  return (
    <button
      type="button"
      title={busy ? 'Already on a call' : `Call ${callee.display_name || callee.username}`}
      disabled={busy}
      onClick={() => { startCall(roomId, callee, 'audio') }}
      style={{
        width:size, height:size, borderRadius:10, flexShrink:0,
        background:'var(--surface)', border:'1px solid var(--border)',
        color: busy ? 'var(--text-muted)' : 'var(--text-dim)',
        cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : 1,
        display:'flex', alignItems:'center', justifyContent:'center', transition:'color 0.15s',
      }}
      onMouseEnter={e => { if (!busy) e.currentTarget.style.color = 'var(--text)' }}
      onMouseLeave={e => { if (!busy) e.currentTarget.style.color = 'var(--text-dim)' }}>
      <Phone size={15} />
    </button>
  )
}
