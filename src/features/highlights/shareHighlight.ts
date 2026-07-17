// src/features/highlights/shareHighlight.ts
//
// Builds a single shareable PNG for a highlight (the illustration/badge/pfp
// + the player's name + the highlight's own caption text, on a branded
// background) and pushes it through the native share sheet. Falls back to
// a plain download if the browser can't share files.
import { getGameMeta } from '../games/games'
import { HIGHLIGHT_ILLUSTRATIONS } from './highlightAssets'
import type { Highlight } from './types'

const CARD_W = 1080
const CARD_H = 1350

// Same "rare fist emoji" mapping used for a canvas fallback, since the
// leaderboard_badge kind renders a Lucide vector icon on-screen but canvas
// can't rasterize that directly — an emoji glyph reads the same at a glance.
const BADGE_EMOJI: Record<string, string> = {
  leaderboard_legend: '🥇',
  runner_up_elite: '🥈',
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

function initialFor(name: string): string {
  const trimmed = (name || '').trim()
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?'
}

async function renderHighlightCanvas(highlight: Highlight, authorName: string): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas')
  canvas.width = CARD_W
  canvas.height = CARD_H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')

  // ── Background ──────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, 0, CARD_H)
  bg.addColorStop(0, '#1a1d29')
  bg.addColorStop(1, '#0d0f16')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, CARD_W, CARD_H)

  // ── Wordmark ────────────────────────────────────────────────
  try {
    const logo = await loadImage('/logo.png')
    const logoH = 64
    const logoW = (logo.width / logo.height) * logoH
    ctx.drawImage(logo, 60, 50, logoW, logoH)
  } catch {
    // Logo failed to load (offline/network hiccup) — fall back to the text mark.
    ctx.fillStyle = '#ff6b00'
    ctx.font = '700 40px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('Chillverse', 60, 100)
  }

  // ── Centerpiece (illustration / badge emoji / profile pic) ───
  const centerX = CARD_W / 2
  const centerY = 480
  const artSize = 420

  if (highlight.kind === 'map_complete') {
    const avatarSrc = highlight.author?.avatar
    const isUrl = !!avatarSrc && /^https?:\/\//.test(avatarSrc)
    ctx.save()
    ctx.beginPath()
    const radius = 90
    const x = centerX - artSize / 2, y = centerY - artSize / 2
    ctx.moveTo(x + radius, y)
    ctx.arcTo(x + artSize, y, x + artSize, y + artSize, radius)
    ctx.arcTo(x + artSize, y + artSize, x, y + artSize, radius)
    ctx.arcTo(x, y + artSize, x, y, radius)
    ctx.arcTo(x, y, x + artSize, y, radius)
    ctx.closePath()
    ctx.clip()

    if (isUrl) {
      try {
        const img = await loadImage(avatarSrc as string)
        ctx.drawImage(img, x, y, artSize, artSize)
      } catch {
        ctx.fillStyle = '#ff6b00'
        ctx.fillRect(x, y, artSize, artSize)
      }
    } else {
      const grad = ctx.createLinearGradient(x, y, x + artSize, y + artSize)
      grad.addColorStop(0, '#ff6b00')
      grad.addColorStop(1, '#ff9a3c')
      ctx.fillStyle = grad
      ctx.fillRect(x, y, artSize, artSize)
      ctx.fillStyle = '#fff'
      ctx.font = '700 200px system-ui, -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(avatarSrc || initialFor(authorName), centerX, centerY + 10)
    }
    ctx.restore()
  } else if (highlight.kind === 'leaderboard_badge') {
    ctx.font = `${artSize * 0.75}px system-ui, -apple-system, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(BADGE_EMOJI[highlight.badge_id ?? ''] ?? '🏆', centerX, centerY)
  } else {
    const src = HIGHLIGHT_ILLUSTRATIONS[highlight.kind]
    if (src) {
      try {
        const img = await loadImage(src)
        const scale = Math.min(artSize / img.width, artSize / img.height)
        const w = img.width * scale, h = img.height * scale
        ctx.drawImage(img, centerX - w / 2, centerY - h / 2, w, h)
      } catch {
        // image failed to load (CORS/network) — fall through with just text below
      }
    }
  }

  // ── Caption ─────────────────────────────────────────────────
  ctx.fillStyle = '#ffffff'
  ctx.font = '800 56px system-ui, -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  const lines = wrapText(ctx, highlight.body, CARD_W - 160)
  let ty = 780
  for (const line of lines) {
    ctx.fillText(line, centerX, ty)
    ty += 66
  }

  // ── Author ──────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.65)'
  ctx.font = '600 34px system-ui, -apple-system, sans-serif'
  ctx.fillText(authorName, centerX, ty + 50)

  // ── Footer ──────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.font = '500 26px system-ui, -apple-system, sans-serif'
  ctx.fillText('chillverse.com.ng', centerX, CARD_H - 50)

  return canvas
}

function shareCaptionFor(highlight: Highlight): string {
  const meta = highlight.game_key ? getGameMeta(highlight.game_key) : undefined
  const tag = meta ? ` #${meta.name.replace(/\s+/g, '')}` : ''
  return `${highlight.body} on Chillverse!${tag}`
}

export async function shareHighlight(highlight: Highlight, authorName: string): Promise<void> {
  const canvas = await renderHighlightCanvas(highlight, authorName)

  const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.95))
  if (!blob) return

  const file = new File([blob], 'chillverse-highlight.png', { type: 'image/png' })
  const caption = shareCaptionFor(highlight)

  const nav = navigator as Navigator & { canShare?: (data?: ShareData & { files?: File[] }) => boolean }

  if (nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: caption, title: 'Chillverse Highlight' })
      return
    } catch {
      // user cancelled the share sheet — no action needed
      return
    }
  }

  // Fallback: browsers without file-sharing support just get a download.
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'chillverse-highlight.png'
  a.click()
  URL.revokeObjectURL(url)
}
