// src/pages/games/TileMerge.tsx
// "Chill Merge" — a Tile-Up-style merge puzzle, reskinned for Chillverse.
// Tap a cell to drop the current tile; same-level tiles merge on contact and
// chain-react. XP is flat per merge (see MERGE_XP), score is level-weighted.
import { useState, useRef, useMemo } from 'react'
import { Layers, Sparkles, RotateCcw } from 'lucide-react'
import type { GameRank, GameEndPayload } from './types'
import { PreGameModal, GameHUD, StatChip, ResultScreen, QuitModal, useRankStreak } from './GameShell'
import { useGamePresence } from '../useGamePresence'

const ACCENT = '#38bdf8'
const GAME_ID = 'tile-merge' as const
const GRID = 4
const CELLS = GRID * GRID

// Flat XP awarded per individual merge event (chains count each step).
const MERGE_XP = 8

// Cycles through Chillverse's existing accent palette so every level reads
// as an on-brand color, not an arbitrary gradient.
const LEVEL_COLORS = ['#4f8ef7', '#9b6dff', '#3ecf8e', '#ff9a3c', '#ff4f4f', '#f5c542', '#ff5fa2', '#00e5ff']
const WILD_GRADIENT = 'linear-gradient(135deg, #f5c542, #ff9a3c)'

interface Tile {
  level: number
  wild?: boolean
  bornAt: number // used to key merge-pop animation
}

function levelColor(level: number) {
  return LEVEL_COLORS[(level - 1) % LEVEL_COLORS.length]
}

function neighborsOf(idx: number): number[] {
  const row = Math.floor(idx / GRID)
  const col = idx % GRID
  const out: number[] = []
  if (row > 0) out.push(idx - GRID)
  if (row < GRID - 1) out.push(idx + GRID)
  if (col > 0) out.push(idx - 1)
  if (col < GRID - 1) out.push(idx + 1)
  return out
}

function rollTile(): Tile {
  const r = Math.random()
  const bornAt = Date.now()
  if (r < 0.06) return { level: 1, wild: true, bornAt }
  if (r < 0.32) return { level: 2, bornAt }
  return { level: 1, bornAt }
}

interface Props {
  rank: GameRank
  onEnd: (payload: GameEndPayload) => void
  onBack: () => void
  sessionsLeft?: number
  sessionCost?: number
}

export default function TileMerge({ rank: initialRank, onEnd, onBack, sessionsLeft = 99, sessionCost = 2 }: Props) {
  const [phase, setPhase] = useState<'info' | 'play' | 'round-end' | 'result' | 'quit'>('info')
  useGamePresence(GAME_ID)
  const { rankState } = useRankStreak(GAME_ID, initialRank)

  const [board, setBoard] = useState<(Tile | null)[]>(Array(CELLS).fill(null))
  const [current, setCurrent] = useState<Tile>(() => rollTile())
  const [next, setNext] = useState<Tile>(() => rollTile())
  const [score, setScore] = useState(0)
  const [mergeCount, setMergeCount] = useState(0)
  const [highestLevel, setHighestLevel] = useState(1)
  const [tries, setTries] = useState(1)
  const [popIdx, setPopIdx] = useState<number | null>(null)
  const [result, setResult] = useState<GameEndPayload | null>(null)

  const startRef = useRef(Date.now())
  const sessionScoreRef = useRef(0)
  const sessionXpRef = useRef(0)
  const sessionMergesRef = useRef(0)

  function freshBoard() {
    setBoard(Array(CELLS).fill(null))
    setCurrent(rollTile())
    setNext(rollTile())
    setScore(0)
    setMergeCount(0)
    setHighestLevel(1)
  }

  function start() {
    sessionScoreRef.current = 0
    sessionXpRef.current = 0
    sessionMergesRef.current = 0
    setTries(1)
    setResult(null)
    startRef.current = Date.now()
    freshBoard()
    setPhase('play')
  }

  function place(idx: number) {
    if (phase !== 'play' || board[idx]) return
    const nb = [...board]
    nb[idx] = { ...current, bornAt: Date.now() }

    let localMerges = 0
    let localScore = 0
    let top = highestLevel

    // Chain-resolve merges outward from the placed cell.
    let cursor = idx
    for (;;) {
      const cell = nb[cursor]
      if (!cell) break
      const match = neighborsOf(cursor).find(n => {
        const t = nb[n]
        return t && (t.level === cell.level || t.wild || cell.wild)
      })
      if (match === undefined) break
      const mergedLevel = cell.level + 1
      nb[cursor] = { level: mergedLevel, bornAt: Date.now() }
      nb[match] = null
      localMerges += 1
      localScore += mergedLevel * 10
      top = Math.max(top, mergedLevel)
    }

    setBoard(nb)
    setPopIdx(cursor)
    setTimeout(() => setPopIdx(null), 260)

    if (localMerges > 0) {
      setMergeCount(m => m + localMerges)
      setScore(s => s + localScore)
      setHighestLevel(top)
      sessionMergesRef.current += localMerges
      sessionScoreRef.current += localScore
      sessionXpRef.current += localMerges * MERGE_XP
    }

    const isFull = nb.every(c => c !== null)
    if (isFull) {
      setPhase('round-end')
      return
    }

    setCurrent(next)
    setNext(rollTile())
  }

  function playAgain() {
    setTries(t => t + 1)
    freshBoard()
    setPhase('play')
  }

  function endSession() {
    const dur = Math.floor((Date.now() - startRef.current) / 1000)
    const payload: GameEndPayload = {
      gameId: GAME_ID,
      gameName: 'Chill Merge',
      rank: 'beginner', // Chill Merge is exempt from the rank system, like Tac Zone
      score: sessionScoreRef.current,
      xpEarned: sessionXpRef.current,
      durationSec: dur,
      streak: highestLevel,
      correct: sessionMergesRef.current,
      total: sessionMergesRef.current,
      detail: { 'Merges': sessionMergesRef.current, 'Tries': tries, 'Top Tile': `Lv.${highestLevel}` },
    }
    setResult(payload)
    setPhase('result')
    onEnd(payload)
  }

  const filled = useMemo(() => board.filter(Boolean).length, [board])

  const rules = [
    { icon: '👆', text: 'Tap any empty cell to place the current tile' },
    { icon: '🔗', text: 'Same-level tiles merge on contact — chains keep going' },
    { icon: '⚡', text: `+${MERGE_XP} XP per merge, added straight to your profile` },
    { icon: '✨', text: 'Gold wild tiles merge with any level next to them' },
    { icon: '🔒', text: `Costs ${sessionCost} sessions per play` },
  ]

  if (phase === 'info') return (
    <PreGameModal
      gameName="Chill Merge"
      tagline="Place tiles, chain the merges, chase the high score."
      accent={ACCENT}
      icon={<Layers size={40} />}
      rules={rules}
      rankState={rankState}
      streakRequired={0}
      onStart={start}
      onClose={onBack}
    />
  )

  if (phase === 'result' && result) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <ResultScreen payload={result} accent={ACCENT} onReplay={() => { setResult(null); start() }} onBack={onBack} sessionsLeft={sessionsLeft} sessionCost={sessionCost} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: 'var(--bg)', position: 'relative' }}>
      <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', filter: 'blur(80px)', opacity: 0.08, background: ACCENT, top: '10%', right: '-8%', pointerEvents: 'none' }} />

      <GameHUD
        gameName="Chill Merge"
        accent={ACCENT}
        icon={<Layers size={14} />}
        streak={highestLevel}
        onQuit={() => setPhase('quit')}
        extraRight={
          <div style={{ display: 'flex', gap: 6 }}>
            <StatChip label="SCORE" value={score} accent={ACCENT} />
            <StatChip label="MERGES" value={mergeCount} accent="var(--gold)" />
          </div>
        }
      />

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, alignItems: 'center', padding: '16px', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: ACCENT, background: `${ACCENT}18`, border: `1px solid ${ACCENT}33`, borderRadius: 12, padding: '4px 10px' }}>
            TRY {tries}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            Session XP: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>+{sessionXpRef.current}</span>
          </span>
        </div>

        {/* Board */}
        <div style={{
          display: 'grid', gridTemplateColumns: `repeat(${GRID}, 74px)`, gridTemplateRows: `repeat(${GRID}, 74px)`,
          gap: 8, background: 'var(--surface2)', padding: 10, borderRadius: 20,
          boxShadow: 'inset 2px 2px 8px var(--neu-dark), inset -2px -2px 6px var(--neu-light)',
        }}>
          {board.map((cell, i) => (
            <button key={i} type="button" onClick={() => place(i)} disabled={!!cell || phase !== 'play'}
              aria-label={cell ? `Level ${cell.level} tile` : `Empty cell ${i + 1}`}
              style={{
                width: 74, height: 74, borderRadius: 16,
                cursor: cell || phase !== 'play' ? 'default' : 'pointer',
                background: cell ? (cell.wild ? WILD_GRADIENT : `linear-gradient(135deg, ${levelColor(cell.level)}, ${levelColor(cell.level)}cc)`) : 'var(--surface)',
                boxShadow: cell
                  ? `0 0 ${popIdx === i ? 26 : 14}px ${cell.wild ? '#f5c54255' : levelColor(cell.level) + '55'}, 3px 3px 8px var(--neu-dark)`
                  : '3px 3px 8px var(--neu-dark), -2px -2px 6px var(--neu-light)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transform: popIdx === i ? 'scale(1.08)' : 'scale(1)',
                transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s',
              }}>
              {cell && (cell.wild
                ? <Sparkles size={22} style={{ color: '#fff' }} />
                : <span style={{ fontSize: 22, fontWeight: 800, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.35)' }}>{cell.level}</span>)}
            </button>
          ))}
        </div>

        {/* Tile tray */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '1px', marginBottom: 6, textTransform: 'uppercase' }}>Place Now</div>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: current.wild ? WILD_GRADIENT : `linear-gradient(135deg, ${levelColor(current.level)}, ${levelColor(current.level)}cc)`,
              boxShadow: `0 0 16px ${current.wild ? '#f5c54255' : levelColor(current.level) + '55'}, 3px 3px 8px var(--neu-dark)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.15)',
            }}>
              {current.wild ? <Sparkles size={20} style={{ color: '#fff' }} /> : <span style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{current.level}</span>}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: 6, textTransform: 'uppercase' }}>Next Up</div>
            <div style={{
              width: 44, height: 44, borderRadius: 12, opacity: 0.65,
              background: next.wild ? WILD_GRADIENT : `linear-gradient(135deg, ${levelColor(next.level)}, ${levelColor(next.level)}cc)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)',
            }}>
              {next.wild ? <Sparkles size={16} style={{ color: '#fff' }} /> : <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{next.level}</span>}
            </div>
          </div>
        </div>

        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{filled}/{CELLS} cells filled — tap an empty cell to drop</p>

        {phase === 'round-end' && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            background: 'var(--surface)', border: `1px solid ${ACCENT}33`, borderRadius: 18,
            padding: '18px 22px', boxShadow: `0 0 24px ${ACCENT}18, 4px 4px 12px var(--neu-dark)`,
          }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: ACCENT }}>Board's full! Round {tries} complete.</p>
            <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>Score {score} · {mergeCount} merges · Top Lv.{highestLevel}</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={playAgain}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '11px 20px', borderRadius: 13, background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}bb)`, border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                <RotateCcw size={14} /> New Board
              </button>
              <button type="button" onClick={endSession}
                style={{ padding: '11px 20px', borderRadius: 13, background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text)', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '3px 3px 8px var(--neu-dark)' }}>
                End Session
              </button>
            </div>
          </div>
        )}

        {phase === 'play' && mergeCount > 0 && (
          <button type="button" onClick={endSession}
            style={{ padding: '9px 18px', borderRadius: 12, background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-dim)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            End Session Early
          </button>
        )}
      </div>

      {phase === 'quit' && <QuitModal onConfirm={onBack} onCancel={() => setPhase('play')} />}
    </div>
  )
}
