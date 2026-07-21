// src/shared/components/ScrollFadeRow.tsx
//
// Wraps a horizontally-scrollable row (like the admin wing tabs or the
// moderation panel tabs) and adds a real visual cue when there's more
// content off-screen: a soft edge fade (CSS mask, so it works over any
// background/theme without color-matching) plus a small chevron on
// whichever side still has content to scroll to. Without this, a
// horizontally-scrollable strip that happens to cut a tab off mid-label
// just looks like the rest of the row doesn't exist.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const FADE_PX = 26

export default function ScrollFadeRow({
  children, className = 'admin-tab-scroll', style,
}: {
  children: ReactNode
  /** Class for the inner scrollable element — defaults to the existing admin-tab-scroll styling. */
  className?: string
  /** Style for the outer wrapper (e.g. `{ flex: 1, minWidth: 0 }` when placed next to another control). */
  style?: CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  const update = useCallback(() => {
    const el = ref.current
    if (!el) return
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    update()
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('resize', update)
    return () => { ro.disconnect(); window.removeEventListener('resize', update) }
  }, [update, children])

  const mask = canLeft && canRight
    ? `linear-gradient(to right, transparent 0, black ${FADE_PX}px, black calc(100% - ${FADE_PX}px), transparent 100%)`
    : canRight
    ? `linear-gradient(to right, black calc(100% - ${FADE_PX}px), transparent 100%)`
    : canLeft
    ? `linear-gradient(to right, transparent 0, black ${FADE_PX}px)`
    : undefined

  return (
    <div style={{ position: 'relative', ...style }}>
      <div
        ref={ref}
        className={className}
        onScroll={update}
        style={mask ? { WebkitMaskImage: mask, maskImage: mask } : undefined}
      >
        {children}
      </div>
      {canLeft && (
        <ChevronLeft
          size={13}
          style={{
            position: 'absolute', left: 1, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-dim)', pointerEvents: 'none', opacity: 0.85,
          }}
        />
      )}
      {canRight && (
        <ChevronRight
          size={13}
          style={{
            position: 'absolute', right: 1, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-dim)', pointerEvents: 'none', opacity: 0.85,
          }}
        />
      )}
    </div>
  )
}
