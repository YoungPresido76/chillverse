// src/components/HaloAI/HaloButton.tsx
import { useState } from 'react'
import { Bot, X } from 'lucide-react'
import { useHalo } from '../../context/HaloContext'

export default function HaloButton() {
  const { isOpen, toggleHalo } = useHalo()
  const [hovering, setHovering] = useState(false)
  const [active, setActive] = useState(false)

  return (
    <div
      className="fixed bottom-6 right-6 z-50"
      style={{ width: 56, height: 56, position: 'fixed' }}
    >
      <div style={{ width: 56, height: 56, position: 'relative' }}>
        {!isOpen && (
          <div
            style={{
              position: 'absolute',
              inset: -4,
              borderRadius: '50%',
              background: 'conic-gradient(#9b6dff, #4f8ef7, #3ecf8e, #9b6dff)',
              opacity: 0.5,
            }}
            className="animate-ping"
          />
        )}

        {!isOpen && hovering && (
          <div
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              right: 0,
              background: 'rgba(0,0,0,0.8)',
              color: '#fff',
              fontSize: 11,
              padding: '4px 8px',
              borderRadius: 6,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            Ask Halo
          </div>
        )}

        <button
          onClick={toggleHalo}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          onMouseDown={() => setActive(true)}
          onMouseUp={() => setActive(false)}
          title="Ask Halo"
          aria-label="Ask Halo"
          style={{
            position: 'relative',
            zIndex: 10,
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'conic-gradient(#9b6dff, #4f8ef7, #3ecf8e, #9b6dff)',
            boxShadow: '0 0 20px rgba(155,109,255,0.5)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            transform: active ? 'scale(0.95)' : 'scale(1)',
            transition: 'transform 200ms ease',
          }}
        >
          <span style={{ display: 'flex', opacity: 1, transition: 'opacity 100ms' }}>
            {isOpen ? <X size={22} color="#fff" /> : <Bot size={22} color="#fff" />}
          </span>
        </button>
      </div>
    </div>
  )
}
