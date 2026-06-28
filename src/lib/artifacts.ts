// src/lib/artifacts.ts
import { supabase } from './supabase'

export type ArtifactTier = 'common' | 'rare' | 'epic' | 'mythic'

export interface Artifact {
  id: string
  name: string
  location: string
  reward_xp: number
  tier: ArtifactTier
  media_url: string
  media_type: 'image' | 'video'
  requires_pro: boolean
  sort_order: number
}

export interface PlayerArtifact {
  artifact_id: string
  unlocked_at: string
}

// ── Fetch all artifact definitions ──────────────────────────
export async function getAllArtifacts(): Promise<Artifact[]> {
  const { data } = await supabase
    .from('artifacts')
    .select('*')
    .order('sort_order')
  return (data ?? []) as Artifact[]
}

// ── Fetch which artifacts a player has unlocked ──────────────
export async function getPlayerArtifacts(userId: string): Promise<PlayerArtifact[]> {
  const { data } = await supabase
    .from('player_artifacts')
    .select('artifact_id, unlocked_at')
    .eq('user_id', userId)
  return (data ?? []) as PlayerArtifact[]
}

// ── Unlock an artifact + award XP + send notification ────────
export async function unlockArtifact(userId: string, artifactId: string): Promise<boolean> {
  // Insert — idempotent due to unique constraint
  const { error } = await supabase
    .from('player_artifacts')
    .insert({ user_id: userId, artifact_id: artifactId })

  if (error) return false // already unlocked or DB error

  // Fetch artifact details for notification + XP
  const { data: art } = await supabase
    .from('artifacts')
    .select('name, reward_xp, tier')
    .eq('id', artifactId)
    .single()

  if (art) {
    // Award XP
    await supabase.rpc('increment_xp', { p_user_id: userId, p_amount: art.reward_xp })

    // Fire notification — Fan icon, picked up by NotificationToastRenderer
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'artifact',
      title: `Artifact Unlocked: ${art.name}`,
      body: `You collected the ${art.name} artifact and earned ${art.reward_xp} XP!`,
      icon: 'fan',
      meta: { artifact_id: artifactId, xp_reward: art.reward_xp, tier: art.tier },
    })
  }

  return true
}
