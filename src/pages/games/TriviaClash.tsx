// src/pages/games/TriviaClash.tsx
import { useState, useEffect, useRef } from 'react'
import { BookOpen } from 'lucide-react'
import type { GameRank, GameEndPayload } from './types'
import { getRankConfig, calcSessionXP } from './types'
import { PreGameModal, GameHUD, StatChip, ResultScreen, QuitModal, TimerBar, useRankStreak } from './GameShell'
import { TRIVIA_QUESTIONS } from './gameData'
import { ripple } from '../../lib/ripple'

const ACCENT = '#ff9a3c'
const GAME_ID = 'trivia-clash' as const

interface RankTriviaConfig {
  questions: number
  totalSec: number
  difficulty: 'easy' | 'medium' | 'mixed'
  streakRequired: number
}

const RANK_CONFIG: Record<GameRank, RankTriviaConfig> = {
  beginner:     { questions: 10, totalSec: 60, difficulty: 'easy',   streakRequired: 5 },
  intermediate: { questions: 10, totalSec: 50, difficulty: 'mixed',  streakRequired: 5 },
  advanced:     { questions: 12, totalSec: 50, difficulty: 'medium', streakRequired: 5 },
  master:       { questions: 10, totalSec: 50, difficulty: 'medium', streakRequired: 5 },
}

interface Props {
  rank: GameRank
  onEnd: (payload: GameEndPayload) => void
  onBack: () => void
}

export default function TriviaClash({ rank: initialRank, onEnd, onBack }: Props) {
  const [phase, setPhase] = useState<'info' | 'play' | 'result' | 'quit'>('info')
  const { rankState, onCorrect, onWrong } = useRankStreak(GAME_ID, initialRank)

  const [questions, setQuestions] = useState<typeof TRIVIA_QUESTIONS>([])
  const [qIdx, setQIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [totalLeft, setTotalLeft] = useState(60)
  const [selected, setSelected] = useState<number | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [promoted, setPromoted] = useState<GameRank | null>(null)
  const [result, setResult] = useState<GameEndPayload | null>(null)

  const scoreRef = useRef(0)
  const correctRef = useRef(0)
  const qIdxRef = useRef(0)
  const startRef = useRef(Date.now())
  const totalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function getRankCfg() { return RANK_CONFIG[rankState.rank] }

  function clearTimers() {
    if (totalTimerRef.current) clearInterval(totalTimerRef.current)
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current)
  }

  function endGame() {
    clearTimers()
    const dur = Math.floor((Date.now() - startRef.current) / 1000)
    const cfg = getRankCfg()
    const xp = calcSessionXP(correctRef.current, cfg.questions, rankState.bestStreak, 4)
    const payload: GameEndPayload = {
      gameId: GAME_ID,
      gameName: 'Trivia Clash',
      rank: rankState.rank,
      score: scoreRef.current,
      xpEarned: xp,
      durationSec: dur,
      streak: rankState.bestStreak,
      correct: correctRef.current,
      total: cfg.questions,
      detail: { 'Correct': correctRef.current, 'Total': cfg.questions },
    }
    setResult(payload)
    setPhase('result')
    onEnd(payload)
  }

  function advance() {
    clearTimers()
    advanceTimerRef.current = setTimeout(() => {
      setSelected(null)
      qIdxRef.current += 1
      const cfg = getRankCfg()
      if (qIdxRef.current >= cfg.questions) {
        endGame()
        return
      }
      setQIdx(qIdxRef.current)
    }, 700)
  }

  function start() {
    const cfg = getRankCfg()
    // Pick questions by difficulty
    const pool = cfg.difficulty === 'easy'
      ? TRIVIA_QUESTIONS.filter(q => q.difficulty === 'easy')
      : cfg.difficulty === 'medium'
        ? TRIVIA_QUESTIONS.filter(q => q.difficulty === 'medium')
        : TRIVIA_QUESTIONS
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, cfg.questions)
    setQuestions(shuffled)
    setQIdx(0); setScore(0); setCorrectCount(0); setSelected(null)
    setPromoted(null); setResult(null)
    qIdxRef.current = 0; scoreRef.current = 0; correctRef.current = 0
    setTotalLeft(cfg.totalSec)
    startRef.current = Date.now()
    setPhase('play')

    totalTimerRef.current = setInterval(() => {
      setTotalLeft(t => {
        if (t <= 1) { endGame(); return 0 }
        return t - 1
      })
    }, 1000)
  }

  function pick(idx: number) {
    if (selected !== null) return
    setSelected(idx)
    const q = questions[qIdxRef.current]
    if (idx === q.correct) {
      const pts = 50
      scoreRef.current += pts; correctRef.current += 1
      setScore(scoreRef.current); setCorrectCount(correctRef.current)
      const { promoted: promo } = onCorrect(getRankConfig(rankState.rank).streakRequired)
      if (promo) setPromoted(promo)
    } else {
      onWrong()
    }
    advance()
  }

  useEffect(() => () => clearTimers(), [])

  const rankCfg = getRankConfig(rankState.rank)
  const cfg = getRankCfg()
  const q = questions[qIdx]
  const totalPct = (totalLeft / cfg.totalSec) * 100

  const rules = [
    { icon: '🧠', text: `${cfg.questions} questions per game` },
    { icon: '⏱', text: `${cfg.totalSec}s total — questions auto-advance` },
    { icon: '📚', text: `${cfg.difficulty === 'easy' ? 'Easy' : cfg.difficulty === 'medium' ? 'Medium' : 'Mixed'} difficulty at ${rankCfg.label}` },
    { icon: '🔥', text: `5 correct in a row = rank up` },
  ]

  if (phase === 'info') return (
    <PreGameModal
      gameName="Trivia Clash"
      tagline="Drop knowledge. Wreck the scoreboard."
      accent={ACCENT}
      icon={<BookOpen size={40} />}
      rules={rules}
      rankState={rankState}
      streakRequired={rankCfg.streakRequired}
      onStart={start}
      onClose={onBack}
    />
  )

  if (phase === 'result' && result) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <ResultScreen payload={result} accent={ACCENT} onReplay={() => { setResult(null); start() }} onBack={onBack} promoted={promoted} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: 'var(--bg)', position: 'relative' }}>
      <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', filter: 'blur(80px)', opacity: 0.07, background: ACCENT, top: '10%', right: '-5%', pointerEvents: 'none' }} />

      <GameHUD
        gameName="Trivia Clash"
        accent={ACCENT}
        icon={<BookOpen size={14} />}
        streak={rankState.currentStreak}
        onQuit={() => setPhase('quit')}
        extraRight={
          <div style={{ display: 'flex', gap: 6 }}>
            <StatChip label="Score" value={score} accent={ACCENT} />
            <StatChip label={`${qIdx + 1}/${cfg.questions}`} value={`${correctCount}✓`} />
          </div>
        }
      />

      {/* Total timer */}
      <div style={{ padding: '8px 16px 4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)', marginBottom: 5 }}>
          <span>Total time</span>
          <span style={{ fontWeight: 700, color: totalLeft < 15 ? 'var(--red)' : 'var(--text-dim)' }}>{totalLeft}s</span>
        </div>
        <TimerBar pct={totalPct} accent={ACCENT} urgent />
      </div>

      {/* Question card */}
      <div className="neu-card" style={{ margin: '10px 16px', padding: '20px 18px', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 0 }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', lineHeight: 1.55 }}>{q?.q}</p>
      </div>

      {/* Answer grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '8px 16px 20px' }}>
        {q?.a.map((ans, i) => {
          const isCorrect = i === q.correct
          const isSelected = selected === i
          let bg = 'var(--surface)'; let border = 'rgba(255,255,255,0.07)'
          if (selected !== null) {
            if (isCorrect) { bg = 'rgba(62,207,142,0.12)'; border = 'rgba(62,207,142,0.5)' }
            else if (isSelected) { bg = 'rgba(255,79,79,0.12)'; border = 'rgba(255,79,79,0.5)' }
          }
          return (
            <button key={i} type="button" className="ripple-wrap"
              onClick={(e) => { ripple(e); pick(i) }}
              style={{ padding: '16px 10px', borderRadius: 14, fontSize: 13, fontWeight: 600, cursor: selected !== null ? 'default' : 'pointer', background: bg, border: `1px solid ${border}`, boxShadow: '3px 3px 8px var(--neu-dark), -2px -2px 6px var(--neu-light)', color: 'var(--text)', textAlign: 'center', transition: 'all 0.2s' }}>
              {ans}
            </button>
          )
        })}
      </div>

      {phase === 'quit' && <QuitModal onConfirm={onBack} onCancel={() => setPhase('play')} />}
    </div>
  )
}
