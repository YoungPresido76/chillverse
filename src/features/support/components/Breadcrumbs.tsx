// src/features/support/components/Breadcrumbs.tsx
import { ChevronRight } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  onClick?: () => void
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}

/** Renders a "A / B / C" trail; the last item is always plain text (current page). */
export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6,
        fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 18,
      }}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            {item.onClick && !isLast ? (
              <button
                type="button"
                onClick={item.onClick}
                style={{
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                  color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 600,
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                {item.label}
              </button>
            ) : (
              <span style={{
                color: isLast ? 'var(--text-dim)' : 'var(--text-muted)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220,
              }}>
                {item.label}
              </span>
            )}
            {!isLast && <ChevronRight size={11} style={{ flexShrink: 0 }} />}
          </span>
        )
      })}
    </nav>
  )
}
