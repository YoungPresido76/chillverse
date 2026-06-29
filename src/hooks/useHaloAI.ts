// src/hooks/useHaloAI.ts
import { useCallback, useEffect, useRef, useState } from 'react'
import type { HaloMessage, HaloPlayerContext } from '../types/halo'
import { buildHaloSystemPrompt, getTopicSections } from '../lib/haloSystemPrompt'
import { haloFallback } from '../lib/haloFallback'

// BUG 6 FIX: Added greetUser to the public interface
export interface UseHaloAIState {
  messages: HaloMessage[]
  isLoading: boolean
  sendMessage: (text: string) => Promise<void>
  clearMessages: () => void
  greetUser: () => void
}

interface GeminiPart {
  text: string
}

interface GeminiContent {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

interface GeminiCandidate {
  content?: {
    parts?: GeminiPart[]
  }
}

interface GeminiResponse {
  candidates?: GeminiCandidate[]
}

interface GeminiRequestBody {
  systemInstruction: {
    parts: GeminiPart[]
  }
  contents: GeminiContent[]
  generationConfig: {
    temperature: number
    maxOutputTokens: number
    topP: number
  }
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function useHaloAI(playerCtx: HaloPlayerContext): UseHaloAIState {
  const [messages, setMessages] = useState<HaloMessage[]>([])
  const [isLoading, setIsLoading]  = useState(false)

  const messagesRef = useRef<HaloMessage[]>(messages)
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  const sendMessage = useCallback(
    async (text: string) => {
      const userMessage: HaloMessage = {
        id: makeId(),
        role: 'user',
        content: text,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, userMessage])
      setIsLoading(true)

      try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
        if (!apiKey) {
          throw new Error('Missing VITE_GEMINI_API_KEY')
        }

        const slimPersona    = buildHaloSystemPrompt(playerCtx)
        const topicKnowledge = getTopicSections(text)

        const systemText =
          `${slimPersona}\n\n` +
          `RELEVANT KNOWLEDGE FOR THIS QUESTION:\n${topicKnowledge}\n\n` +
          `Keep replies to 1-4 sentences unless asked to elaborate. ` +
          `Use gaming slang naturally. Never break character.`

        const priorContents: GeminiContent[] = messagesRef.current.map(msg => ({
          role: msg.role === 'halo' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        }))

        const body: GeminiRequestBody = {
          systemInstruction: {
            parts: [{ text: systemText }],
          },
          contents: [
            ...priorContents,
            { role: 'user', parts: [{ text }] },
          ],
          generationConfig: {
            temperature: 0.75,
            maxOutputTokens: 300,
            topP: 0.9,
          },
        }

        const endpoint =
          `https://generativelanguage.googleapis.com/v1beta/models/` +
          `gemini-2.0-flash:generateContent?key=${apiKey}`

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          const errBody = await response.text()
          console.error('[HaloAI] Gemini HTTP error body:', errBody)
          throw new Error(`Gemini API error ${response.status}: ${errBody}`)
        }

        const data = (await response.json()) as GeminiResponse
        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text

        if (!replyText) {
          throw new Error('Empty Gemini response')
        }

        const haloMessage: HaloMessage = {
          id: makeId(),
          role: 'halo',
          content: replyText,
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, haloMessage])

      } catch (err: unknown) {
        console.error('[HaloAI] FULL ERROR', err)

        const errMsg = err instanceof Error ? err.message : String(err)
        let fallbackText: string

        if (errMsg.includes('VITE_GEMINI_API_KEY')) {
          console.error(
            '[HaloAI] ⚠️  VITE_GEMINI_API_KEY is not configured.\n' +
            '  LOCAL: add VITE_GEMINI_API_KEY=<your_key> to .env.local and restart dev server.\n' +
            '  VERCEL: Settings → Environment Variables → add for Production → Redeploy.'
          )
          fallbackText =
            '[Dev: VITE_GEMINI_API_KEY missing — set it in Vercel env vars and redeploy.] ' +
            haloFallback(text, playerCtx)

        } else if (errMsg.includes('404')) {
          console.error(
            '[HaloAI] ⚠️  404 — model endpoint not found. ' +
            'Check https://ai.google.dev/gemini-api/docs/models for current model names.'
          )
          fallbackText = haloFallback(text, playerCtx)

        } else if (errMsg.includes('429') || errMsg.includes('quota')) {
          console.error('[HaloAI] ⚠️  Gemini quota hit. Check quota at https://ai.google.dev/gemini-api/docs/quota')
          fallbackText =
            haloFallback(text, playerCtx) +
            ' (Dev: Gemini rate limit hit — check your quota in Google AI Studio.)'

        } else if (errMsg.includes('Empty Gemini response')) {
          console.error('[HaloAI] ⚠️  Empty response — likely a safety filter block. Try rephrasing.')
          fallbackText = haloFallback(text, playerCtx)

        } else {
          fallbackText = haloFallback(text, playerCtx)
        }

        const haloMessage: HaloMessage = {
          id: makeId(),
          role: 'halo',
          content: fallbackText,
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, haloMessage])

      } finally {
        setIsLoading(false)
      }
    },
    [playerCtx]
  )

  // BUG 6 FIX: greetUser injects a Halo-side welcome message directly into
  // state without creating a user turn — keeps the empty state clean and
  // makes the chat feel alive from first open.
  const greetUser = useCallback(() => {
    const hour = new Date().getHours()
    const timeGreet =
      hour < 12 ? 'Good morning' :
      hour < 17 ? 'Good afternoon' :
      hour < 21 ? 'Good evening' : 'Hey'

    const greeting: HaloMessage = {
      id: makeId(),
      role: 'halo',
      content: `${timeGreet}, ${playerCtx.displayName}! 👾 I'm Halo, your personal Chillverse guide. You're at ${playerCtx.rankEmoji} ${playerCtx.rankName} with ${playerCtx.xp.toLocaleString()} XP — keep grinding! 🔥 Ask me about your rank, game tips, missions, exploration, or anything else on the platform. What can I help you with today?`,
      timestamp: new Date(),
    }
    setMessages([greeting])
  }, [playerCtx])

  const clearMessages = useCallback(() => {
    setMessages([])
    messagesRef.current = []
  }, [])

  return { messages, isLoading, sendMessage, clearMessages, greetUser }
}
