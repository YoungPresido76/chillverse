import { useState, useEffect } from 'react'
import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, UserPlus, UserCheck, ShieldOff,
  MessageCircle, Zap, Flame, Sprout, Shield,
  Moon, Crown, Sword, Gamepad2, Trophy, Clapperboard,
  ChevronRight,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { getRecentSessions } from '../lib/gameSession'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LucideIcon = React.ComponentType<any>

const RANKS = [
  { min: 0,      max: 999,      title: 'Newcomer', color: '#888899' },
  { min: 1000,   max: 4999,     title: 'Scout',    color: '#3ecf8e' },
  { min: 5000,   max: 9999,     title: 'Warrior',  color: '#4f8ef7' },
  { min: 10000,  max: 24999,    title: 'Elite',    color: '#9b6dff' },
  { min: 25000,  max: 49999,    title: 'Shadow',   color: '#ff4d8b' },
  { min: 50000,  max: 99999,    title: 'Legend',   color: '#f5c542' },
  { min: 100000, max: Infinity, title: 'Mythic',   color: '#ff6b00' },
]
const RANK_ICONS: Record<string, LucideIcon> = {
  Newcomer: Sprout, Scout: Zap, Warrior: Sword,
  Elite: Shield, Shadow: Moon, Legend: Crown, Mythic: Flame,
}
function getRank(xp: number) { return RANKS.find(r => xp >= r.min && xp <= r.max) ?? RANKS[0] }

const GAME_LABELS: Record<string, string> = {
  neon_blitz: 'Neon Blitz', grid_ghost: 'Grid Ghost', flux_sort: 'Flux Sort',
  trivia_clash: 'Trivia Clash', tac_zone: 'Tac Zone', flag_rush: 'Flag Rush',
}
function activityIcon(game: string): LucideIcon {
  if (game === 'studio') return Clapperboard
  if (game === 'trivia_clash') return Trophy
  return Gamepad2
}

interface PlayerData {
  id: string
  username: string
  display_name: string | null
  avatar: string
  country: string | null
  interests: string[]
  xp: number
  level: number
  streak: number
}

export default function PlayerProfile() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const { session } = useAuth()
  const myId = session?.user?.id ?? null

  const [player, setPlayer] = useState<PlayerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [xpBarWidth, setXpBarWidth] = useState(0)
  const [followers, setFollowers] = useState<number>(0)
  const [following, setFollowing] = useState<number>(0)
  const [followStatus, setFollowStatus] = useState<'none' | 'following' | 'blocked'>('none')
  const [actionLoading, setActionLoading] = useState(false)
  const [activities, setActivities] = useState<Array<{ id: string; game: string; score: number; xp_earned: number; played_at: string }>>([])
  const [activitiesLoading, setActivitiesLoading] = useState(true)

  // Redirect to own profile if viewing self
  useEffect(() => {
    if (myId && userId === myId) navigate('/profile', { replace: true })
  }, [myId, userId, navigate])

  // Load player data
  useEffect(() => {
    if (!userId) return
    setLoading(true)
    supabase.from('profiles').select('id, username, display_name, avatar, country, interests, xp, level, streak')
      .eq('id', userId).single()
      .then(({ data }) => {
        setPlayer(data as PlayerData)
        setLoading(false)
      })
  }, [userId])

  // Animate XP bar
  useEffect(() => {
    if (!player) return
    setXpBarWidth(0)
    const t = setTimeout(() => {
      setXpBarWidth(Math.min(100, Math.round(((player.xp % 1000) / 1000) * 100)))
    }, 120)
    return () => clearTimeout(t)
  }, [player?.xp])

  // Load follower counts
  useEffect(() => {
    if (!userId) return
    supabase.from('profile_follow_counts').select('followers_count, following_count')
      .eq('id', userId).single()
      .then(({ data }) => {
        if (data) { setFollowers(Number(data.followers_count)); setFollowing(Number(data.following_count)) }
      })
  }, [userId])

  // Check follow/block status
  useEffect(() => {
    if (!myId || !userId) return
    const check = async () => {
      const { data: followRow } = await supabase.from('follows')
        .select('id').eq('follower_id', myId).eq('following_id', userId).maybeSingle()
      if (followRow) { setFollowStatus('following'); return }
      const { data: blockRow } = await supabase.from('blocks')
        .select('id').eq('blocker_id', myId).eq('blocked_id', userId).maybeSingle()
      if (blockRow) setFollowStatus('blocked')
    }
    check()
  }, [myId, userId])

  // Load activities
  useEffect(() => {
    if (!userId) return
    setActivitiesLoading(true)
    getRecentSessions(userId, 8).then(({ data }) => {
      setActivities(data as Array<{ id: string; game: string; score: number; xp_earned: number; played_at: string }>)
      setActivitiesLoading(false)
    })
  }, [userId])

  async function handleFollow() {
    if (!myId || !userId || actionLoading) return
    setActionLoading(true)
    if (followStatus === 'following') {
      await supabase.from('follows').delete().eq('follower_id', myId).eq('following_id', userId)
      setFollowStatus('none')
      setFollowers(f => Math.max(0, f - 1))
    } else {
      await supabase.from('follows').insert({ follower_id: myId, following_id: userId })
      setFollowStatus('following')
      setFollowers(f => f + 1)
    }
    setActionLoading(false)
  }

  async function handleBlock() {
    if (!myId || !userId || actionLoading) return
    setActionLoading(true)
    if (followStatus === 'blocked') {
      await supabase.from('blocks').delete().eq('blocker_id', myId).eq('blocked_id', userId)
      setFollowStatus('none')
    } else {
      await supabase.from('follows').delete().eq('follower_id', myId).eq('following_id', userId)
      await supabase.from('blocks').insert({ blocker_id: myId, blocked_id: userId })
      setFollowStatus('blocked')
      setFollowers(f => Math.max(0, f - 1))
    }
    setActionLoading(false)
  }

  async function handleMessage() {
    if (!myId || !userId) return
    // Find or create DM room then navigate to chat
    const { data: myRooms } = await supabase.from('room_members').select('room_id').eq('user_id', myId)
    const { data: theirRooms } = await supabase.from('room_members').select('room_id').eq('user_id', userId)
    if (myRooms && theirRooms) {
      const myIds = new Set(myRooms.map(r => r.room_id))
      const common = theirRooms.find(r => myIds.has(r.room_id))
      if (common) { navigate('/chat'); return }
    }
    const { data: newRoom } = await supabase.from('chat_rooms').insert({ type: 'dm', name: null }).select('id').single()
    if (newRoom) {
      await supabase.from('room_members').insert([
        { room_id: newRoom.id, user_id: myId },
        { room_id: newRoom.id, user_id: userId },
      ])
    }
    navigate('/chat')
  }

  if (loading || !player) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <span style={{ display: 'block', width: 36, height: 36, borderRadius: '50%', border: '2px solid var(--surface3)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const rank = getRank(player.xp)
  const RankIcon = RANK_ICONS[rank.title] ?? Zap
  const displayName = player.display_name || player.username

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 60 }}>
      {/* Topbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <button type="button" onClick={() => navigate(-1)}
          style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '2px 2px 6px var(--neu-dark)', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ArrowLeft size={14} />
        </button>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Player Profile</span>
        <div style={{ width: 34 }} />
      </div>

      {/* Hero */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {/* Avatar */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <div style={{ width: 88, height: 88, borderRadius: 26, padding: 3, background: `linear-gradient(135deg, ${rank.color}, #4f8ef7)`, boxShadow: `0 0 24px ${rank.color}44` }}>
            <div style={{ width: '100%', height: '100%', borderRadius: 22, background: 'linear-gradient(135deg, var(--purple), var(--blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 800, color: '#fff' }}>
              {displayName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Rank badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: rank.color + '18', color: rank.color, border: `1px solid ${rank.color}33`, fontSize: 11, fontWeight: 700, marginBottom: 10 }}>
          <RankIcon size={12} /> {rank.title}
        </div>

        <p style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--text)', marginBottom: 4 }}>{displayName}</p>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 16 }}>@{player.username}</p>

        {/* Stats row */}
        <div style={{ display: 'flex', maxWidth: 340, width: '100%', marginBottom: 16 }}>
          {[
            { label: 'Followers', value: followers.toLocaleString() },
            { label: 'Following', value: following.toLocaleString() },
            { label: 'Level',     value: player.level },
          ].map((s, i) => (
            <div key={s.label} style={{ display: 'flex', flex: 1 }}>
              {i > 0 && <div style={{ width: 1, background: 'rgba(255,255,255,0.07)', margin: '10px 0' }} />}
              <div style={{ flex: 1, textAlign: 'center', padding: '12px 8px' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{s.value}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, maxWidth: 340, width: '100%', marginBottom: 16 }}>
          <button type="button" onClick={handleFollow} disabled={actionLoading || followStatus === 'blocked'}
            style={{ flex: 1, padding: '10px 8px', borderRadius: 13, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: 'none', cursor: actionLoading || followStatus === 'blocked' ? 'not-allowed' : 'pointer', background: followStatus === 'following' ? 'rgba(62,207,142,0.15)' : 'linear-gradient(135deg,var(--accent),var(--accent2))', color: followStatus === 'following' ? '#3ecf8e' : '#fff', opacity: followStatus === 'blocked' ? 0.4 : 1, transition: 'all 0.15s' }}>
            {followStatus === 'following' ? <><UserCheck size={13} /> Following</> : <><UserPlus size={13} /> Follow</>}
          </button>
          <button type="button" onClick={handleMessage}
            style={{ flex: 1, padding: '10px 8px', borderRadius: 13, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', transition: 'all 0.15s' }}>
            <MessageCircle size={13} /> Message
          </button>
          <button type="button" onClick={handleBlock} disabled={actionLoading}
            style={{ padding: '10px 12px', borderRadius: 13, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: 'none', cursor: actionLoading ? 'not-allowed' : 'pointer', background: followStatus === 'blocked' ? 'rgba(255,107,107,0.2)' : 'rgba(255,107,107,0.08)', color: followStatus === 'blocked' ? '#ff6b6b' : 'var(--text-muted)', transition: 'all 0.15s' }}>
            <ShieldOff size={13} />
          </button>
        </div>

        {/* XP bar */}
        <div style={{ maxWidth: 340, width: '100%', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)', marginBottom: 5 }}>
            <span>Level {player.level} · {rank.title}</span>
            <span>{player.xp.toLocaleString()} XP</span>
          </div>
          <div className="xp-track">
            <div className="xp-fill" style={{ width: `${xpBarWidth}%`, background: `linear-gradient(90deg, ${rank.color}, #4f8ef7)`, boxShadow: `0 0 10px ${rank.color}66` }} />
          </div>
        </div>

        {/* Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
          <span className="chip"><Flame size={11} style={{ color: 'var(--accent)' }} /> <strong>{player.streak}</strong> day streak</span>
          <span className="chip"><Zap size={11} style={{ color: 'var(--gold)' }} /> <strong>{player.xp.toLocaleString()}</strong> XP</span>
          {player.country && <span className="chip">📍 <strong>{player.country}</strong></span>}
          {player.interests?.slice(0, 2).map(tag => (
            <span key={tag} className="chip">🎯 <strong>{tag}</strong></span>
          ))}
        </div>
      </div>

      {/* Activity Feed */}
      <div style={{ padding: '0 20px' }}>
        <p className="section-label">Activity</p>
        {activitiesLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <span style={{ display: 'block', width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--surface3)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : activities.length === 0 ? (
          <div className="neu-card-sm" style={{ padding: '32px 20px', textAlign: 'center' }}>
            <Gamepad2 size={32} style={{ color: 'var(--text-muted)', display: 'block', margin: '0 auto 10px' }} />
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No activity yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 32 }}>
            {activities.map((item, i) => {
              const Icon = activityIcon(item.game)
              const typeColors: Record<string, string> = {
                neon_blitz: '#4f8ef7', grid_ghost: '#9b6dff', flux_sort: '#ff4d8b',
                trivia_clash: '#ff9a3c', tac_zone: '#3ecf8e', flag_rush: '#4f8ef7',
              }
              const color = typeColors[item.game] ?? '#888899'
              const diff = Date.now() - new Date(item.played_at).getTime()
              const mins = Math.floor(diff / 60000)
              const timeAgo = mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.floor(mins / 60)}h ago` : `${Math.floor(mins / 1440)}d ago`
              return (
                <div key={item.id} className="neu-card"
                  style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px', animationDelay: `${i * 0.05}s` }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0, background: `${color}18`, boxShadow: '2px 2px 8px var(--neu-dark), -1px -1px 5px var(--neu-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                    <Icon size={20} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
                      {GAME_LABELS[item.game] ?? item.game}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                      Score: {item.score} · +{item.xp_earned} XP
                    </div>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{timeAgo}</span>
                  <ChevronRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                </div>
              )
            })}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
