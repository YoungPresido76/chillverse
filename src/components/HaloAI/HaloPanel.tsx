// src/components/HaloAI/HaloPanel.tsx
import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { ArrowLeft, Send } from 'lucide-react'
import { useHalo } from '../../context/HaloContext'
import { useHaloAI } from '../../hooks/useHaloAI'
import type { HaloPlayerContext } from '../../types/halo'
import HaloMessage from './HaloMessage'
import HaloTypingDots from './HaloTypingDots'

interface HaloPanelProps {
  playerCtx: HaloPlayerContext
}

export default function HaloPanel({ playerCtx }: HaloPanelProps) {
  const { isOpen, closeHalo } = useHalo()
  const { messages, isLoading, sendMessage } = useHaloAI(playerCtx)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Lock body scroll when panel is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    sendMessage(trimmed)
    setInput('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Backdrop — tap to close */}
      {isOpen && (
        <div
          onClick={closeHalo}
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 30,
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Halo AI Assistant"
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          height: '100%',
          zIndex: 40,
          width: '100%',
          maxWidth: 440,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface)',
          boxShadow: '-4px 0 40px rgba(0,0,0,0.6)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 320ms cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* ── HEADER ── */}
        <div
          style={{
            background: 'var(--surface)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            padding: '0 16px',
            height: 60,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexShrink: 0,
          }}
        >
          {/* Back / Close button — large, high-contrast, visible on ALL devices */}
          <button
            type="button"
            onClick={closeHalo}
            aria-label="Go back"
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.18s, transform 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.14)'
              e.currentTarget.style.transform = 'translateX(-2px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
              e.currentTarget.style.transform = 'translateX(0)'
            }}
            onTouchStart={e => {
              e.currentTarget.style.background = 'rgba(155,109,255,0.3)'
            }}
            onTouchEnd={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
            }}
          >
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>

          {/* Spinning halo orb */}
          <div
            aria-hidden="true"
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'conic-gradient(#9b6dff, #4f8ef7, #3ecf8e, #9b6dff)',
              animation: 'halo-spin 4s linear infinite',
              flexShrink: 0,
            }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Halo AI</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--purple)', letterSpacing: 1 }}>
              POWERED BY CVWT
            </span>
          </div>

          {/* Status pill */}
          <div
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: 'rgba(62,207,142,0.12)',
              border: '1px solid rgba(62,207,142,0.25)',
              borderRadius: 20,
              padding: '3px 10px',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#3ecf8e',
                display: 'inline-block',
                boxShadow: '0 0 6px #3ecf8e',
              }}
            />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#3ecf8e', letterSpacing: 0.5 }}>
              ONLINE
            </span>
          </div>
        </div>

        {/* ── MESSAGE LIST ── */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            background: 'var(--bg)',
            padding: '16px 16px 8px',
            display: 'flex',
            flexDirection: 'column',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {messages.length === 0 ? (
            <div
              style={{
                margin: 'auto',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: 13,
                maxWidth: 260,
                lineHeight: 1.6,
              }}
            >
              Ask me anything about Chillverse, your rank, or game tips 👾
            </div>
          ) : (
            messages.map(message => <HaloMessage key={message.id} message={message} />)
          )}
          {isLoading && <HaloTypingDots />}
          <div ref={bottomRef} />
        </div>

        {/* ── INPUT AREA ── */}
        <div
          style={{
            background: 'var(--surface)',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            padding: '10px 14px',
            display: 'flex',
            gap: 8,
            alignItems: 'flex-end',
            flexShrink: 0,
            // Safe area for iOS home bar
            paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
          }}
        >
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Halo anything…"
            rows={1}
            style={{
              flex: 1,
              background: 'var(--surface2)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '10px 14px',
              fontSize: 14,
              color: 'var(--text)',
              resize: 'none',
              maxHeight: 100,
              outline: 'none',
              fontFamily: 'inherit',
              lineHeight: 1.5,
            }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim()}
            aria-label="Send message"
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: input.trim() ? 'var(--purple)' : 'rgba(155,109,255,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              border: 'none',
              cursor: input.trim() ? 'pointer' : 'default',
              transition: 'background 0.2s, transform 0.15s',
            }}
            onMouseEnter={e => {
              if (input.trim()) e.currentTarget.style.transform = 'scale(1.08)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            <Send size={17} color="#fff" />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes halo-spin {
          to { transform: rotate(360deg); }
        }
        /* Ensure the panel is always full-width on phones, capped on tablet/desktop */
        @media (max-width: 480px) {
          [aria-label="Halo AI Assistant"] {
            max-width: 100% !important;
          }
        }
      `}</style>
    </>
  )
}
