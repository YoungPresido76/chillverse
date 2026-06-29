// src/pages/HaloAI.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Send, Bot, Sparkles } from 'lucide-react'
import { useHaloAI } from '../hooks/useHaloAI'
import HaloMessage from '../components/HaloAI/HaloMessage'
import HaloTypingDots from '../components/HaloAI/HaloTypingDots'
import { useProfile } from '../hooks/useProfile'
import { useAuth } from '../hooks/useAuth'
import { getUserRankTier } from '../lib/ranks'
import { getGlobalSessionInfo } from '../lib/gameSession'
import { supabase } from '../lib/supabase'
import type { HaloPlayerContext } from '../types/halo'

const PROMPT_CHIPS = [
  "What's my current rank?",
  'Give me game tips 🎮',
  'How do I earn more XP?',
  "What's new in Chillverse?",
]

export default function HaloAIPage() {
  const { profile } = useProfile()
  const { user } = useAuth()
  const [input, setInput] = useState('')
  const [wishlistNames, setWishlistNames] = useState<string[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // BUG 6 FIX: guard so greetUser only fires once per mount
  const hasGreeted = useRef(false)

  useEffect(() => {
    if (!user) { setWishlistNames([]); return }
    let active = true
    supabase
      .from('wishlist')
      .select('item_name')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (!active) return
        setWishlistNames((data ?? []).map((row: { item_name: string }) => row.item_name))
      })
    return () => { active = false }
  }, [user])

  const xp = profile?.xp ?? 0
  const rankTier = getUserRankTier(xp)
  const sessionInfo = user ? getGlobalSessionInfo(user.id) : { count: 0 }

  // BUG 7 FIX: memoize playerCtx so sendMessage / greetUser are not recreated
  // on every render due to a new object reference being constructed each time.
  const playerCtx: HaloPlayerContext = useMemo(() => ({
    displayName: profile?.display_name ?? profile?.username ?? 'Player',
    rankName: rankTier.name,
    rankEmoji: rankTier.emoji,
    streakDays: profile?.streak ?? 0,
    favoriteGame: profile?.favorite_game ?? null,
    wishlistItems: wishlistNames,
    sessionsToday: sessionInfo.count,
    xp,
    level: profile?.level ?? 1,
  }), [profile, rankTier, wishlistNames, sessionInfo.count, xp])

  const { messages, isLoading, sendMessage, greetUser } = useHaloAI(playerCtx)

  // BUG 6 FIX: auto-greet on first mount once the profile is available
  useEffect(() => {
    if (hasGreeted.current || !profile) return
    hasGreeted.current = true
    greetUser()
  }, [profile, greetUser])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return
    sendMessage(trimmed)
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleChip = (chip: string) => {
    if (isLoading) return
    sendMessage(chip)
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  // After auto-greet, messages.length will be 1 — empty state only shown
  // before profile has loaded and greetUser has fired.
  const isEmpty = messages.length === 0

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100dvh - 60px)',
        maxWidth: 760,
        margin: '0 auto',
        position: 'relative',
      }}
    >
      {/* ── Page Header ── */}
      <div
        style={{
          flexShrink: 0,
          padding: '18px 0 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            background: 'conic-gradient(#9b6dff, #4f8ef7, #3ecf8e, #9b6dff)',
            boxShadow: '0 0 20px rgba(155,109,255,0.45)',
            animation: 'halo-page-spin 4s linear infinite',
            flexShrink: 0,
          }}
        />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Halo AI</span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: 'var(--purple)',
                letterSpacing: 1.2,
                background: 'rgba(155,109,255,0.1)',
                border: '1px solid rgba(155,109,255,0.2)',
                borderRadius: 5,
                padding: '2px 5px',
              }}
            >
              CVWT
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            Your personal game coach &amp; Chillverse guide
          </p>
        </div>

        {profile && (
          <div
            style={{
              marginLeft: 'auto',
              background: 'var(--surface2)',
              borderRadius: 10,
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 14 }}>{rankTier.emoji}</span>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1 }}>Rank</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>
                {rankTier.name}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Message List ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 0',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {isEmpty ? (
          /* ── Empty state (only while profile is loading before greet fires) ── */
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              padding: '0 16px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'conic-gradient(#9b6dff, #4f8ef7, #3ecf8e, #9b6dff)',
                boxShadow: '0 0 40px rgba(155,109,255,0.35)',
                animation: 'halo-page-spin 4s linear infinite',
                marginBottom: 4,
              }}
            />
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                Ask me anything 👾
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 280 }}>
                Your rank, game tips, Chillverse info, or anything else you need.
              </p>
            </div>

            {/* BUG 5 FIX: chips disabled + dimmed while loading */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                justifyContent: 'center',
                marginTop: 8,
              }}
            >
              {PROMPT_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleChip(chip)}
                  disabled={isLoading}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid rgba(155,109,255,0.18)',
                    borderRadius: 20,
                    padding: '8px 14px',
                    fontSize: 12,
                    color: 'var(--text-dim)',
                    cursor: isLoading ? 'default' : 'pointer',
                    transition: 'all 0.18s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    boxShadow: '3px 3px 8px var(--neu-dark), -2px -2px 6px var(--neu-light)',
                    opacity: isLoading ? 0.4 : 1,
                    pointerEvents: isLoading ? 'none' : 'auto',
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading) {
                      e.currentTarget.style.borderColor = 'rgba(155,109,255,0.45)'
                      e.currentTarget.style.color = 'var(--text)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(155,109,255,0.18)'
                    e.currentTarget.style.color = 'var(--text-dim)'
                  }}
                >
                  <Sparkles size={11} style={{ color: 'var(--purple)', flexShrink: 0 }} />
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <HaloMessage key={message.id} message={message} />
            ))}
            {isLoading && <HaloTypingDots />}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* ── Input Area ── */}
      <div
        style={{
          flexShrink: 0,
          padding: '12px 0 max(12px, env(safe-area-inset-bottom))',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {profile && !isEmpty && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              marginBottom: 8,
              paddingLeft: 2,
            }}
          >
            <Bot size={10} style={{ color: 'var(--purple)' }} />
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              Halo knows you're <strong style={{ color: 'var(--text-dim)' }}>{playerCtx.displayName}</strong> · {rankTier.emoji} {rankTier.name} · {profile.streak}🔥 streak
            </span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask Halo anything…"
            rows={1}
            style={{
              flex: 1,
              background: 'var(--surface)',
              border: '1px solid rgba(155,109,255,0.15)',
              borderRadius: 14,
              padding: '12px 14px',
              fontSize: 14,
              color: 'var(--text)',
              resize: 'none',
              minHeight: 46,
              maxHeight: 120,
              lineHeight: '1.5',
              outline: 'none',
              boxShadow: 'inset 3px 3px 8px var(--neu-dark), inset -2px -2px 5px var(--neu-light)',
              transition: 'border-color 0.2s',
              fontFamily: 'inherit',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(155,109,255,0.4)' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(155,109,255,0.15)' }}
          />

          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            aria-label="Send message"
            style={{
              width: 46,
              height: 46,
              borderRadius: '50%',
              background: input.trim() && !isLoading
                ? 'linear-gradient(135deg, #9b6dff, #4f8ef7)'
                : 'var(--surface2)',
              border: 'none',
              cursor: input.trim() && !isLoading ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: input.trim() && !isLoading
                ? '0 4px 16px rgba(155,109,255,0.4)'
                : '3px 3px 8px var(--neu-dark), -2px -2px 6px var(--neu-light)',
              transition: 'all 0.2s',
              opacity: isLoading ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (input.trim() && !isLoading) e.currentTarget.style.transform = 'scale(1.05)'
            }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            <Send size={18} color={input.trim() && !isLoading ? '#fff' : 'var(--text-muted)'} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes halo-page-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
