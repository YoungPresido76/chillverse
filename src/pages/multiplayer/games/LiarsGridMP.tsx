// src/pages/multiplayer/games/LiarsGridMP.tsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { calcSessionXP, getRankConfig } from '../../games/types'
import type { GameRank } from '../../games/types'
import { calcRaceRoundScore, getRoundTimeState, calcTeamScores, teamXpMultiplier } from '../raceEngine'
import type { PlayerRoundResult } from '../raceEngine'
import MultiplayerResults from '../MultiplayerResults'
import type { PlayerResult } from '../MultiplayerResults'
import type { MPGameProps } from './mpGameTypes'
import type { RealtimeChannel } from '@supabase/supabase-js'

const ROUNDS     = 8
const ROUND_SEC  = 12
const REVEAL_MS  = 2400

// ── Grid generation (mirrors solo LiarsGrid logic) ────────────
interface GridCell { expression: string; result: number; isLiar: boolean }

function generateGrid(): { cells: GridCell[]; liarIndex: number } {
  const cells: GridCell[] = []
  const liarIndex = Math.floor(Math.random() * 9)

  for (let i = 0; i < 9; i++) {
    const a = Math.floor(Math.random() * 9) + 1
    const b = Math.floor(Math.random() * 9) + 1
    const ops = ['+', '-', '×'] as const
    const op  = ops[Math.floor(Math.random() * ops.length)]
    let result = op === '+' ? a + b : op === '-' ? a - b : a * b

    if (i === liarIndex) {
      // Make the result wrong by ±1-3
      const offset = (Math.floor(Math.random() * 3) + 1) * (Math.random() < 0.5 ? 1 : -1)
      result += offset
    }

    cells.push({ expression: `${a} ${op} ${b}`, result, isLiar: i === liarIndex })
  }
  return { cells, liarIndex }
}

type Phase = 'playing' | 'reveal' | 'ended'

interface GridEvent {
  type: 'grid_start' | 'grid_answer' | 'grid_reveal' | 'grid_end'
  roundIndex?:   number
  serverTs?:     string
  cells?:        GridCell[]
  liarIndex?:    number
  playerId?:     string
  tappedIdx?:    number
  results?:      PlayerRoundResult[]
  finalScores?:  Record<string, number>
  finalCorrect?: Record<string, number>
}

export default function LiarsGridMP({ roomId, myId, players, room, onGameOver }: MPGameProps) {
  const isOrchestrator = players[0]?.player_id === myId
  const teamMode       = (room.team_mode ?? 'ffa') as 'ffa' | '2v2'
  const teams          = Object.fromEntries(players.map(p => [p.player_id, p.team ?? null])) as Record<string, 'A' | 'B' | null>

  const [cells,        setCells]        = useState<GridCell[]>([])
  const [liarIndex,    setLiarIndex]    = useState<number | null>(null)
  const [roundIndex,   setRoundIndex]   = useState(0)
  const [phase,        setPhase]        = useState<Phase>('playing')
  const [serverTs,     setServerTs]     = useState<string | null>(null)
  const [tapped,       setTapped]       = useState<number | null>(null)
  const [revealData,   setRevealData]   = useState<{ results: PlayerRoundResult[]; liar: number } | null>(null)
  const [scores,       setScores]       = useState<Record<string, number>>({})
  const [correctCount, setCorrectCount] = useState<Record<string, number>>({})
  const [timeLeft,     setTimeLeft]     = useState(ROUND_SEC)
  const [results,      setResults]      = useState<PlayerResult[] | null>(null)

  const channelRef    = useRef<RealtimeChannel | null>(null)
  const answersRef    = useRef<Record<string, { tappedIdx: number; responseMs: number }>>({})
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null)
  const roundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function runDisplayTimer(ts: string) {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      const { remainingMs } = getRoundTimeState(ts, ROUND_SEC)
      setTimeLeft(Math.ceil(remainingMs / 1000))
      if (remainingMs <= 0 && timerRef.current) clearInterval(timerRef.current)
    }, 100)
  }

  const resolveRound = useCallback((idx: number, liar: number) => {
    if (!channelRef.current) return
    const results: PlayerRoundResult[] = players.map(p => {
      const a       = answersRef.current[p.player_id]
      const correct = a !== undefined && a.tappedIdx === liar
      const points  = a ? calcRaceRoundScore(correct, a.responseMs) : 0
      return { playerId: p.player_id, answer: a?.tappedIdx ?? null, responseMs: a?.responseMs ?? ROUND_SEC * 1000, pointsEarned: points, correct }
    })
    channelRef.current.send({
      type: 'broadcast', event: 'grid_event',
      payload: { type: 'grid_reveal', roundIndex: idx, results, liarIndex: liar } as GridEvent,
    })
    answersRef.current = {}
  }, [players])

  const startRound = useCallback((idx: number) => {
    if (!channelRef.current) return
    const { cells: newCells, liarIndex: liar } = generateGrid()
    const ts = new Date().toISOString()
    channelRef.current.send({
      type: 'broadcast', event: 'grid_event',
      payload: { type: 'grid_start', roundIndex: idx, serverTs: ts, cells: newCells, liarIndex: liar } as GridEvent,
    })
    if (roundTimerRef.current) clearTimeout(roundTimerRef.current)
    roundTimerRef.current = setTimeout(() => resolveRound(idx, liar), (ROUND_SEC + 0.5) * 1000)
  }, [resolveRound])

  useEffect(() => {
    const channel = supabase.channel(`grid:${roomId}`, { config: { broadcast: { self: true } } })
    channelRef.current = channel

    channel.on('broadcast', { event: 'grid_event' }, ({ payload }) => {
      const ev = payload as GridEvent

      if (ev.type === 'grid_start' && ev.cells && ev.serverTs) {
        setCells(ev.cells)
        setLiarIndex(ev.liarIndex ?? null)
        setRoundIndex(ev.roundIndex ?? 0)
        setServerTs(ev.serverTs)
        setTapped(null)
        setRevealData(null)
        setPhase('playing')
        runDisplayTimer(ev.serverTs)
      }

      if (ev.type === 'grid_answer' && ev.playerId && isOrchestrator) {
        answersRef.current[ev.playerId] = { tappedIdx: ev.tappedIdx ?? -1, responseMs: ev.serverTs ? Date.now() - new Date(ev.serverTs).getTime() : ROUND_SEC * 1000 }
        if (Object.keys(answersRef.current).length >= players.length) {
          if (roundTimerRef.current) clearTimeout(roundTimerRef.current)
          resolveRound(ev.roundIndex ?? 0, ev.liarIndex ?? 0)
        }
      }

      if (ev.type === 'grid_reveal' && ev.results) {
        setPhase('reveal')
        setRevealData({ results: ev.results, liar: ev.liarIndex ?? 0 })
        if (timerRef.current) clearInterval(timerRef.current)
        setScores(prev => { const n = { ...prev }; ev.results!.forEach(r => n[r.playerId] = (n[r.playerId] ?? 0) + r.pointsEarned); return n })
        setCorrectCount(prev => { const n = { ...prev }; ev.results!.forEach(r => { if (r.correct) n[r.playerId] = (n[r.playerId] ?? 0) + 1 }); return n })
        setTimeout(() => {
          const next = (ev.roundIndex ?? 0) + 1
          if (next >= ROUNDS) {
            if (isOrchestrator) {
              channelRef.current?.send({ type: 'broadcast', event: 'grid_event', payload: { type: 'grid_end' } as GridEvent })
            }
          } else if (isOrchestrator) startRound(next)
        }, REVEAL_MS)
      }

      if (ev.type === 'grid_end') {
        const rank: GameRank = 'beginner'
        const rankCfg = getRankConfig(rank)
        const teamScores = teamMode === '2v2' ? calcTeamScores(scores, teams) : null
        const winTeam = teamScores ? (teamScores.teamA > teamScores.teamB ? 'A' : teamScores.teamB > teamScores.teamA ? 'B' : 'draw') : null

        const playerResults: PlayerResult[] = players.map(p => {
          const score   = scores[p.player_id] ?? 0
          const correct = correctCount[p.player_id] ?? 0
          const mult    = teamMode === '2v2' ? teamXpMultiplier(p.player_id, teams, winTeam as 'A' | 'B' | 'draw' | null) : 1.0
          const xp      = Math.round(calcSessionXP(correct, ROUNDS, 0, rankCfg.xpBase) * mult)
          return { playerId: p.player_id, displayName: p.display_name || p.username, score, correct, total: ROUNDS, streak: 0, rank, xpEarned: xp, team: p.team }
        })
        setResults(playerResults)
        onGameOver()
      }
    })

    channel.subscribe(() => { if (isOrchestrator) startRound(0) })
    return () => { channel.unsubscribe(); if (timerRef.current) clearInterval(timerRef.current); if (roundTimerRef.current) clearTimeout(roundTimerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId])

  function handleTap(idx: number) {
    if (tapped !== null || phase !== 'playing' || !serverTs) return
    setTapped(idx)
    const responseMs = Date.now() - new Date(serverTs).getTime()
    answersRef.current[myId] = { tappedIdx: idx, responseMs }
    channelRef.current?.send({
      type: 'broadcast', event: 'grid_event',
      payload: { type: 'grid_answer', roundIndex, playerId: myId, tappedIdx: idx, serverTs, liarIndex: liarIndex ?? 0 } as GridEvent,
    })
  }

  if (results) {
    return <MultiplayerResults gameName="Liar's Grid" gameEmoji="🔢" myId={myId} players={results} teamMode={teamMode} onPlayAgain={() => window.location.reload()} />
  }

  const answeredCount = revealData ? revealData.results.length : Object.keys(answersRef.current).length

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* HUD */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ background: 'var(--surface)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>🔢 Liar's Grid</span>
        <span className="text-xs font-mono px-2 py-1 rounded-lg" style={{ background: 'var(--surface2)', color: '#4f8ef7' }}>Round {roundIndex + 1}/{ROUNDS}</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{answeredCount}/{players.length} answered</span>
      </div>

      {/* Timer */}
      <div className="h-1" style={{ background: 'var(--surface2)' }}>
        <div className="h-full transition-all" style={{ width: `${(timeLeft / ROUND_SEC) * 100}%`, background: timeLeft <= 3 ? '#ff4f4f' : '#3ecf8e', transition: 'width 0.1s linear' }} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-6 max-w-md mx-auto w-full">
        <div className="text-center">
          <p className="font-bold text-base mb-1" style={{ color: 'var(--text)' }}>Find the wrong equation!</p>
          <p className="text-xs font-mono" style={{ color: timeLeft <= 3 ? '#ff4f4f' : 'var(--text-muted)' }}>{timeLeft}s</p>
        </div>

        {/* Grid */}
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)', width: '100%', maxWidth: 320 }}>
          {cells.map((cell, idx) => {
            const isTapped   = tapped === idx
            const isLiar     = revealData && idx === revealData.liar
            const isMyWrong  = revealData && isTapped && !isLiar
            const whoTapped  = revealData?.results.filter(r => r.answer === idx).map(r => players.find(p => p.player_id === r.playerId)?.display_name?.charAt(0) ?? '?') ?? []

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleTap(idx)}
                disabled={tapped !== null || phase === 'reveal'}
                className="rounded-2xl p-3 text-center transition-all duration-150 relative"
                style={{
                  background: isLiar ? 'rgba(255,79,79,0.2)' : isMyWrong ? 'rgba(255,79,79,0.1)' : isTapped ? 'rgba(79,142,247,0.2)' : 'var(--surface)',
                  border: isLiar ? '2px solid #ff4f4f' : isTapped ? '2px solid #4f8ef7' : '2px solid rgba(255,255,255,0.07)',
                  cursor: tapped !== null ? 'default' : 'pointer',
                }}
              >
                <p className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>{cell.expression}</p>
                <p className="text-lg font-extrabold font-mono" style={{ color: isLiar ? '#ff4f4f' : 'var(--text)' }}>= {cell.result}</p>
                {whoTapped.length > 0 && (
                  <div className="flex gap-0.5 justify-center mt-1">
                    {whoTapped.map((init, i) => (
                      <span key={i} className="text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold text-white" style={{ background: '#4f8ef7' }}>{init}</span>
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Live scores */}
        <div className="flex gap-2 flex-wrap justify-center">
          {[...players].sort((a, b) => (scores[b.player_id] ?? 0) - (scores[a.player_id] ?? 0)).map(p => (
            <div key={p.player_id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
              style={{ background: p.player_id === myId ? 'rgba(79,142,247,0.12)' : 'var(--surface2)', color: p.player_id === myId ? '#4f8ef7' : 'var(--text-dim)', border: `1px solid ${p.player_id === myId ? 'rgba(79,142,247,0.3)' : 'transparent'}` }}>
              {(p.display_name || p.username).split(' ')[0]}
              <span className="font-mono">{scores[p.player_id] ?? 0}</span>
              {teamMode === '2v2' && p.team && <span style={{ color: p.team === 'A' ? '#4f8ef7' : '#9b6dff' }}>{p.team}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
