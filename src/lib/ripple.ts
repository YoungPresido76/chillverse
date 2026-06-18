// src/lib/ripple.ts
import type { MouseEvent } from 'react'

/**
 * Shared "ripple" click micro-interaction, ported once from the dashboard
 * mockup so every clickable card/row/nav-item can reuse it instead of
 * duplicating the effect per component.
 *
 * Spawns a short-lived expanding circle at the click coordinates inside
 * whichever element triggered the event, then cleans itself up once the
 * animation finishes. Purely cosmetic — call it alongside (not instead of)
 * any navigation/handler logic already on the element's onClick.
 */
export function ripple(e: MouseEvent<HTMLElement>): void {
  const target = e.currentTarget
  const rect = target.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height) * 2

  const span = document.createElement('span')
  span.style.position = 'absolute'
  span.style.width = `${size}px`
  span.style.height = `${size}px`
  span.style.left = `${e.clientX - rect.left - size / 2}px`
  span.style.top = `${e.clientY - rect.top - size / 2}px`
  span.style.borderRadius = '50%'
  span.style.background = 'rgba(255,255,255,0.18)'
  span.style.pointerEvents = 'none'
  span.style.transform = 'scale(0)'
  span.style.opacity = '1'
  span.style.transition = 'transform 0.6s ease-out, opacity 0.6s ease-out'
  span.style.zIndex = '0'

  const computedStyle = window.getComputedStyle(target)
  if (computedStyle.position === 'static') {
    target.style.position = 'relative'
  }
  if (computedStyle.overflow === 'visible') {
    target.style.overflow = 'hidden'
  }

  target.appendChild(span)

  requestAnimationFrame(() => {
    span.style.transform = 'scale(1)'
    span.style.opacity = '0'
  })

  setTimeout(() => {
    span.remove()
  }, 650)
}
