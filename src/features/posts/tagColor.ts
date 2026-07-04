// src/features/posts/tagColor.ts
import { RANK_TIERS } from '../profile/ranks'
import type { PostTag } from './types'

/** Returns a color for tag chips where a color has real meaning — otherwise undefined (default chip style). */
export function getTagColor(tag: PostTag): string | undefined {
  switch (tag.type) {
    case 'rank': {
      const tier = RANK_TIERS.find(t => t.id === tag.ref_id)
      return tier?.color
    }
    case 'game_result':
    case 'multiplayer_result':
      return 'var(--blue)'
    case 'user':
      return 'var(--accent)'
    default:
      return undefined
  }
}
