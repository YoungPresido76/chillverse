// src/components/HaloAI/HaloMessage.tsx
import type { HaloMessage as HaloMessageType } from '../../types/halo'

interface HaloMessageProps {
  message: HaloMessageType
}

export default function HaloMessage({ message }: HaloMessageProps) {
  const isUser = message.role === 'user'
  const time = message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
      <div style={{ maxWidth: '80%' }}>
        <div
          style={{
            background: isUser ? 'var(--accent)' : 'var(--surface2)',
            borderLeft: isUser ? undefined : '2px solid var(--purple)',
            borderRadius: isUser ? '12px 12px 4px 12px' : '4px 12px 12px 12px',
            padding: '10px 14px',
            fontSize: 13,
            color: isUser ? '#fff' : 'var(--text)',
            whiteSpace: 'pre-wrap',
          }}
        >
          {message.content}
        </div>
        <div
          style={{
            fontSize: 10,
            marginTop: 3,
            textAlign: isUser ? 'right' : 'left',
            color: isUser ? 'rgba(255,255,255,0.5)' : 'var(--text-muted)',
          }}
        >
          {time}
        </div>
      </div>
    </div>
  )
}
