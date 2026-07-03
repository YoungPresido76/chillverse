// src/hooks/useTriviaQuestions.ts
//
// Fetches trivia questions from Open Trivia DB (opentdb.com).
// Uses a session token stored in localStorage per user so questions
// never repeat until the full pool (~4000 questions) is exhausted,
// at which point the token resets automatically.
//
// API is completely free, no key, no card required.

import { useState, useCallback } from 'react'
import type { GameRank } from './play/types'

// ── Open Trivia DB types ──────────────────────────────────────
interface OTDBQuestion {
  question: string
  correct_answer: string
  incorrect_answers: string[]
  difficulty: 'easy' | 'medium' | 'hard'
  category: string
}

// Normalized shape that matches what TriviaClash expects
export interface TriviaQuestion {
  q: string
  a: [string, string, string, string]
  correct: 0 | 1 | 2 | 3
  difficulty: 'easy' | 'medium'
}

// ── Difficulty mapping ────────────────────────────────────────
const RANK_DIFFICULTY: Record<GameRank, 'easy' | 'medium'> = {
  beginner:     'easy',
  intermediate: 'easy',
  advanced:     'medium',
  master:       'medium',
}

// ── Session token helpers (localStorage) ─────────────────────
const TOKEN_KEY = 'otdb_session_token'

async function getOrCreateToken(): Promise<string> {
  const stored = localStorage.getItem(TOKEN_KEY)
  if (stored) return stored
  return createFreshToken()
}

async function createFreshToken(): Promise<string> {
  const res  = await fetch('https://opentdb.com/api_token.php?command=request')
  const data = await res.json()
  if (data.response_code === 0 && data.token) {
    localStorage.setItem(TOKEN_KEY, data.token)
    return data.token
  }
  throw new Error('Failed to get OTDB session token')
}

async function resetToken(token: string): Promise<string> {
  const res  = await fetch(`https://opentdb.com/api_token.php?command=reset&token=${token}`)
  const data = await res.json()
  if (data.response_code === 0) {
    localStorage.setItem(TOKEN_KEY, data.token)
    return data.token
  }
  // If reset fails, just create a brand new one
  return createFreshToken()
}

// ── HTML entity decoder (OTDB returns encoded HTML) ───────────
function decode(str: string): string {
  const txt = document.createElement('textarea')
  txt.innerHTML = str
  return txt.value
}

// ── Shuffle array ─────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

// ── Normalize OTDB question to TriviaQuestion ─────────────────
function normalize(raw: OTDBQuestion): TriviaQuestion {
  const correct = decode(raw.correct_answer)
  const wrong   = raw.incorrect_answers.map(decode)
  // Build pool of 4 answers and shuffle
  const pool    = shuffle([correct, ...wrong]).slice(0, 4) as [string, string, string, string]
  const correctIdx = pool.indexOf(correct) as 0 | 1 | 2 | 3
  return {
    q:          decode(raw.question),
    a:          pool,
    correct:    correctIdx,
    difficulty: raw.difficulty === 'hard' ? 'medium' : raw.difficulty,
  }
}

// ── OTDB response codes ───────────────────────────────────────
// 0 = success, 1 = no results, 2 = invalid param, 3 = token not found, 4 = token exhausted

// ── Main hook ─────────────────────────────────────────────────
export type FetchState = 'idle' | 'loading' | 'ready' | 'error'

export function useTriviaQuestions() {
  const [questions,  setQuestions]  = useState<TriviaQuestion[]>([])
  const [fetchState, setFetchState] = useState<FetchState>('idle')
  const [error,      setError]      = useState<string | null>(null)

  const fetchQuestions = useCallback(async (rank: GameRank, amount: number) => {
    setFetchState('loading')
    setError(null)

    const difficulty = RANK_DIFFICULTY[rank]

    try {
      let token = await getOrCreateToken()
      let data  = await fetchFromOTDB(amount, difficulty, token)

      // Token exhausted → reset and try again once
      if (data.response_code === 4) {
        token = await resetToken(token)
        data  = await fetchFromOTDB(amount, difficulty, token)
      }

      // Token not found → create fresh and try again
      if (data.response_code === 3) {
        localStorage.removeItem(TOKEN_KEY)
        token = await createFreshToken()
        data  = await fetchFromOTDB(amount, difficulty, token)
      }

      if (data.response_code !== 0 || !data.results?.length) {
        throw new Error(`OTDB error code ${data.response_code}`)
      }

      setQuestions(data.results.map(normalize))
      setFetchState('ready')
    } catch (err) {
      console.error('[useTriviaQuestions]', err)
      setError('Could not load questions. Check your connection and try again.')
      setFetchState('error')
    }
  }, [])

  return { questions, fetchState, error, fetchQuestions }
}

// ── Raw OTDB fetch ────────────────────────────────────────────
async function fetchFromOTDB(amount: number, difficulty: 'easy' | 'medium', token: string) {
  const url = `https://opentdb.com/api.php?amount=${amount}&difficulty=${difficulty}&type=multiple&token=${token}`
  const res  = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<{ response_code: number; results: OTDBQuestion[] }>
}
