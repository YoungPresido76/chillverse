// src/components/PageOnboarding.tsx
//
// Drop <PageOnboarding pageKey="dashboard" /> into any page. It:
//  - Looks up that page's content from onboardingContent.ts
//  - Checks profiles.onboarding_seen[pageKey] via useOnboarding
//  - Shows a full-screen blocking modal the FIRST time the account visits
//    that page (any device, survives logout — only resets if the account
//    is deleted)
//  - For pages with 2 images, renders a swipeable carousel with a
//    persistent "Swipe →" toast until the player swipes once
//  - "Got it" is disabled for 15s. On single-image pages the timer starts
//    on open; on carousels it only starts once the player reaches the
//    last card.

import { useState, useEffect, useRef, type TouchEvent } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, Settings as SettingsIcon } from 'lucide-react'
import { ripple } from '../../shared/lib/ripple'
import { useOnboarding } from './useOnboarding'
import { ONBOARDING_CONTENT } from './onboardingContent'

const LOCK_SECONDS = 3

interface PageOnboardingProps {
  pageKey: string
}

export default function PageOnboarding({ pageKey }: PageOnboardingProps) {
  const content = ONBOARDING_CONTENT[pageKey]
  const { loading, seen, markSeen } = useOnboarding(pageKey)

  const [cardIndex, setCardIndex] = useState(0)
  const [hasSwiped, setHasSwiped] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(LOCK_SECONDS)

  const touchStartX = useRef<number | null>(null)
  const dragOffset = useRef(0)
  const [dragX, setDragX] = useState(0)
  const cardRef = useRef<HTMLDivElement>(null)

  const slides = content?.slides ?? []
  const isCarousel = slides.length > 1
  const onLastCard = cardIndex === slides.length - 1

  // Lock timer now runs for the whole page as soon as it opens, independent
  // of swiping/scrolling between slides (some laptop trackpads couldn't
  // trigger the swipe gesture, which previously blocked the timer from
  // ever starting on carousels).
  useEffect(() => {
    if (seen || loading) return
    setSecondsLeft(LOCK_SECONDS)
    const interval = setInterval(() => {
      setSecondsLeft(s => (s <= 1 ? 0 : s - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [seen, loading])

  if (loading || seen || !content || slides.length === 0) return null

  const slide = slides[cardIndex]
  const canDismiss = onLastCard && secondsLeft <= 0
  const showSwipeToast = isCarousel && !hasSwiped && cardIndex === 0

  function goToNext() {
    if (cardIndex < slides.length - 1) {
      setHasSwiped(true)
      setCardIndex(i => i + 1)
    }
  }

  function goToPrev() {
    if (cardIndex > 0) setCardIndex(i => i - 1)
  }

  function onTouchStart(e: TouchEvent<HTMLDivElement>) {
    touchStartX.current = e.touches[0].clientX
  }

  function onTouchMove(e: TouchEvent<HTMLDivElement>) {
    if (touchStartX.current === null) return
    const delta = e.touches[0].clientX - touchStartX.current
    // Only allow dragging toward "next" if there's a next card, and
    // toward "prev" if there's a previous card.
    if ((delta < 0 && cardIndex < slides.length - 1) || (delta > 0 && cardIndex > 0)) {
      dragOffset.current = delta
      setDragX(delta)
    }
  }

  function onTouchEnd() {
    const delta = dragOffset.current
    const SWIPE_THRESHOLD = 60
    if (delta < -SWIPE_THRESHOLD) {
      goToNext()
    } else if (delta > SWIPE_THRESHOLD) {
      goToPrev()
    }
    touchStartX.current = null
    dragOffset.current = 0
    setDragX(0)
  }

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%', maxWidth: 380,
          maxHeight: 'min(86vh, 640px)',
          borderRadius: 24,
          background: 'linear-gradient(160deg, #1a1a1e, #111113)',
          border: '1.5px solid color-mix(in srgb, var(--accent) 28%, transparent)',
          boxShadow: '0 24px 64px color-mix(in srgb, var(--accent) 12%, transparent), 0 8px 32px rgba(0,0,0,0.7)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Image / card area */}
        <div
          ref={cardRef}
          onTouchStart={isCarousel ? onTouchStart : undefined}
          onTouchMove={isCarousel ? onTouchMove : undefined}
          onTouchEnd={isCarousel ? onTouchEnd : undefined}
          style={{
            position: 'relative',
            width: '100%',
            flexShrink: 0,
            height: 'clamp(130px, 30vh, 220px)',
            background: '#0a0a0b',
            overflow: 'hidden',
            touchAction: isCarousel ? 'pan-y' : undefined,
          }}
        >
          {slide.image ? (
            <img
              src={slide.image}
              alt={content.title}
              draggable={false}
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                transform: `translateX(${dragX}px)`,
                transition: dragX === 0 ? 'transform 0.25s ease' : 'none',
                userSelect: 'none',
              }}
            />
          ) : (
            <div
              style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 12%, transparent), rgba(255,154,60,0.04))',
              }}
            >
              <SettingsIcon size={64} style={{ color: 'color-mix(in srgb, var(--accent) 40%, transparent)' }} />
            </div>
          )}

          {/* Dot indicators for carousel */}
          {isCarousel && (
            <div
              style={{
                position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
                display: 'flex', gap: 6,
              }}
            >
              {slides.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === cardIndex ? 18 : 6, height: 6, borderRadius: 3,
                    background: i === cardIndex ? 'var(--accent)' : 'rgba(255,255,255,0.35)',
                    transition: 'background-color var(--dur-base) var(--ease-out), color var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out), opacity var(--dur-base) var(--ease-out)',
                  }}
                />
              ))}
            </div>
          )}

          {/* Persistent "Swipe" toast — pinned to the right edge of the card */}
          {showSwipeToast && (
            <div
              style={{
                position: 'absolute',
                right: 48,
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '8px 12px',
                borderRadius: 100,
                background: 'rgba(17,17,19,0.88)',
                border: '1.5px solid color-mix(in srgb, var(--accent) 50%, transparent)',
                color: 'var(--accent2)',
                fontSize: 12,
                fontWeight: 700,
                animation: 'onbSwipeNudge 1.3s ease-in-out infinite',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              Swipe or tap <ChevronLeft size={14} style={{ transform: 'rotate(180deg)' }} />
            </div>
          )}

          {/* Prev arrow once they've moved forward */}
          {isCarousel && cardIndex > 0 && (
            <button
              type="button"
              onClick={(e) => { ripple(e); goToPrev() }}
              style={{
                position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(17,17,19,0.7)', border: '1px solid var(--border-strong)',
                color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <ChevronLeft size={16} />
            </button>
          )}

          {/* Next arrow — always visible on carousels (click target for
              laptop/desktop users whose trackpads don't register the
              swipe gesture) */}
          {isCarousel && cardIndex < slides.length - 1 && (
            <button
              type="button"
              onClick={(e) => { ripple(e); goToNext() }}
              aria-label="Next"
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(17,17,19,0.7)', border: '1px solid var(--border-strong)',
                color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <ChevronLeft size={16} style={{ transform: 'rotate(180deg)' }} />
            </button>
          )}
        </div>

        {/* Text content — scrolls internally if long, so the button below
            never gets pushed off-screen on shorter PC viewports. */}
        <div style={{ padding: '16px 22px 0', flexShrink: 0 }}>
          <div
            style={{
              fontSize: 10, fontWeight: 800, color: 'var(--accent2)',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
            }}
          >
            Onboarding
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>
            {content.title}
          </h2>
        </div>
        <div
          style={{
            padding: '0 22px',
            overflowY: 'auto',
            flex: '1 1 auto',
            minHeight: 0,
          }}
        >
          <p
            style={{
              fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-muted)',
              margin: 0, whiteSpace: 'pre-line',
            }}
          >
            {slide.text}
          </p>
        </div>

        <div style={{ padding: '14px 22px 20px', flexShrink: 0 }}>
          {/* Got it button */}
          <button
            type="button"
            disabled={!canDismiss}
            onClick={(e) => {
              if (!canDismiss) return
              ripple(e)
              markSeen()
            }}
            style={{
              width: '100%',
              padding: '14px 0',
              borderRadius: 14,
              border: 'none',
              fontSize: 15,
              fontWeight: 800,
              cursor: canDismiss ? 'pointer' : 'not-allowed',
              color: canDismiss ? '#fff' : 'var(--text-muted)',
              background: canDismiss
                ? 'linear-gradient(135deg, var(--accent), var(--accent2))'
                : 'rgba(255,255,255,0.06)',
              transition: 'background 0.25s ease, color 0.25s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {canDismiss
              ? 'Got it'
              : isCarousel && !onLastCard
                ? 'Swipe to continue'
                : `Got it (${secondsLeft}s)`}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes onbSwipeNudge {
          0%, 100% { transform: translateY(-50%) translateX(0); opacity: 0.85; }
          50%      { transform: translateY(-50%) translateX(-6px); opacity: 1; }
        }
      `}</style>
    </div>,
    document.body,
  )
}
