// src/features/posts/TagAutosuggest.tsx
import type { TagSuggestion } from './types'

const TAG_ICON: Record<string, string> = {
  achievement: '🏆', game_result: '🎮', multiplayer_result: '⚔️', rank: '🎖️',
  streak: '🔥', mission: '📋', user: '👤', avatar: '🖼️', artifact: '💎', mall_item: '🛍️',
}

export default function TagAutosuggest({
  suggestions,
  onPick,
}: {
  suggestions: TagSuggestion[]
  onPick: (s: TagSuggestion) => void
}) {
  if (suggestions.length === 0) return null

  return (
    <div className="neu-card-sm" style={{ padding: 6, marginTop: 6, maxHeight: 220, overflowY: 'auto' }}>
      {suggestions.map((s, i) => (
        <button
          key={`${s.type}-${s.ref_id}-${i}`}
          type="button"
          onClick={() => onPick(s)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
            background: s.fromRecentEvent ? 'var(--surface2)' : 'transparent', border: 'none',
            borderRadius: 8, padding: '7px 8px', cursor: 'pointer', color: 'var(--text)', fontSize: 12.5,
          }}
        >
          <span>{TAG_ICON[s.type] ?? '🏷️'}</span>
          <span style={{ flex: 1 }}>{s.label}</span>
          {s.fromRecentEvent && (
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent)' }}>JUST NOW</span>
          )}
        </button>
      ))}
    </div>
  )
}
