// src/shared/lib/markdownLite.ts
// A tiny, dependency-free markdown subset for blog post content: headings
// (## / ###), bullet + numbered lists, blockquotes, links, bold, and italic.
// Deliberately NOT a full markdown/HTML pipeline — content stays plain text
// in the database (paragraphs separated by a blank line, same convention as
// support_articles), so existing seed posts with no markdown syntax in them
// still render exactly as before: this only adds *optional* formatting on
// top of that convention, it doesn't replace it.
import { createElement, type ReactNode } from 'react'

const INLINE_TOKEN = /(\*\*.+?\*\*|\*.+?\*|\[.+?\]\(.+?\))/g

function parseInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(INLINE_TOKEN).filter(p => p !== '')
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`
    const boldMatch = /^\*\*(.+)\*\*$/.exec(part)
    if (boldMatch) return createElement('strong', { key }, boldMatch[1])
    const italicMatch = /^\*(.+)\*$/.exec(part)
    if (italicMatch) return createElement('em', { key }, italicMatch[1])
    const linkMatch = /^\[(.+)\]\((.+)\)$/.exec(part)
    if (linkMatch) {
      return createElement(
        'a',
        { key, href: linkMatch[2], target: '_blank', rel: 'noopener noreferrer', style: { color: 'var(--accent)', textDecoration: 'underline' } },
        linkMatch[1]
      )
    }
    return part
  })
}

/** Renders a blog post's plain-text/lite-markdown content into React nodes, one block per paragraph-gap-separated chunk. */
export function renderLiteMarkdown(content: string): ReactNode[] {
  const blocks = content.split(/\n\s*\n/).filter(Boolean)

  return blocks.map((block, i) => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
    const key = `block-${i}`

    if (block.startsWith('### ')) {
      return createElement('h3', { key, style: H3_STYLE }, parseInline(block.replace(/^### /, ''), key))
    }
    if (block.startsWith('## ')) {
      return createElement('h2', { key, style: H2_STYLE }, parseInline(block.replace(/^## /, ''), key))
    }
    if (block.startsWith('> ')) {
      return createElement('blockquote', { key, style: QUOTE_STYLE }, parseInline(block.replace(/^>\s?/, ''), key))
    }
    if (lines.length > 0 && lines.every(l => /^[-*]\s/.test(l))) {
      return createElement(
        'ul', { key, style: LIST_STYLE },
        lines.map((l, j) => createElement('li', { key: `${key}-${j}`, style: LI_STYLE }, parseInline(l.replace(/^[-*]\s/, ''), `${key}-${j}`)))
      )
    }
    if (lines.length > 0 && lines.every(l => /^\d+\.\s/.test(l))) {
      return createElement(
        'ol', { key, style: LIST_STYLE },
        lines.map((l, j) => createElement('li', { key: `${key}-${j}`, style: LI_STYLE }, parseInline(l.replace(/^\d+\.\s/, ''), `${key}-${j}`)))
      )
    }
    return createElement('p', { key, style: P_STYLE }, parseInline(block, key))
  })
}

const P_STYLE: React.CSSProperties = { fontSize: 15, lineHeight: 1.75, color: 'var(--text)', margin: '0 0 18px' }
const H2_STYLE: React.CSSProperties = { fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: '28px 0 12px' }
const H3_STYLE: React.CSSProperties = { fontSize: 17, fontWeight: 800, color: 'var(--text)', margin: '22px 0 10px' }
const LIST_STYLE: React.CSSProperties = { margin: '0 0 18px', paddingLeft: 22 }
const LI_STYLE: React.CSSProperties = { fontSize: 15, lineHeight: 1.75, color: 'var(--text)', marginBottom: 6 }
const QUOTE_STYLE: React.CSSProperties = {
  margin: '0 0 18px', padding: '4px 0 4px 16px', borderLeft: '3px solid var(--accent)',
  fontSize: 15, lineHeight: 1.7, color: 'var(--text-dim)', fontStyle: 'italic',
}

// ── Toolbar helper — inserts/wraps markdown syntax at the textarea's cursor ──

export type MarkdownAction = 'bold' | 'italic' | 'h2' | 'h3' | 'bullet' | 'numbered' | 'quote' | 'link'

/** Given a textarea's current value + selection, returns the new value and
 *  where the cursor should land afterwards. Wraps the selection for
 *  bold/italic/link, prefixes each selected line for block-level actions. */
export function applyMarkdownAction(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  action: MarkdownAction
): { value: string; selectionStart: number; selectionEnd: number } {
  const selected = value.slice(selectionStart, selectionEnd)

  function wrap(marker: string, placeholder: string) {
    const text = selected || placeholder
    const inserted = `${marker}${text}${marker}`
    const next = value.slice(0, selectionStart) + inserted + value.slice(selectionEnd)
    return { value: next, selectionStart: selectionStart + marker.length, selectionEnd: selectionStart + marker.length + text.length }
  }

  function prefixLines(prefix: (i: number) => string, placeholder: string) {
    const text = selected || placeholder
    const lines = text.split('\n')
    const inserted = lines.map((l, i) => `${prefix(i)}${l}`).join('\n')
    const next = value.slice(0, selectionStart) + inserted + value.slice(selectionEnd)
    return { value: next, selectionStart, selectionEnd: selectionStart + inserted.length }
  }

  switch (action) {
    case 'bold': return wrap('**', 'bold text')
    case 'italic': return wrap('*', 'italic text')
    case 'h2': return prefixLines(() => '## ', 'Heading')
    case 'h3': return prefixLines(() => '### ', 'Subheading')
    case 'bullet': return prefixLines(() => '- ', 'List item')
    case 'numbered': return prefixLines(i => `${i + 1}. `, 'List item')
    case 'quote': return prefixLines(() => '> ', 'Quote')
    case 'link': {
      const text = selected || 'link text'
      const inserted = `[${text}](https://)`
      const next = value.slice(0, selectionStart) + inserted + value.slice(selectionEnd)
      // Select the "https://" part so it's ready to be typed over.
      const urlStart = selectionStart + text.length + 3
      return { value: next, selectionStart: urlStart, selectionEnd: urlStart + 8 }
    }
  }
}
