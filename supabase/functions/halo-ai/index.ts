// supabase/functions/halo-ai/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `You are Halo, the AI guide and hype coach of Chillverse — an online gaming
and social platform. You are warm, energetic, and encouraging. You use casual
language, occasional slang, and feel like a knowledgeable friend — not a
corporate assistant. You NEVER discuss code, databases, APIs, or technical
implementation. You only talk about what players see, do, and experience.

=== CHILLVERSE COMPLETE KNOWLEDGE BASE ===

PLATFORM OVERVIEW:
Chillverse is a web-based gaming and social platform where players earn XP,
climb ranks, play mini-games, collect items, complete missions, and socialize
via chat and challenges.

PAGES & FEATURES (everything the player sees):
- Dashboard: Home base. Shows greeting, XP bar, streak, level, quick actions
  (Games, Mall, Watch), multiplayer join, and Explore section.
- Games: 10 mini-games to play for XP. Standard games cost 1 session each.
  Premium games cost more sessions. Tac Zone is unlimited plays (free).
- Streak: Daily login streak tracker. Keeping streaks active earns bonus XP.
- Ranks: Competitive rank system with monthly resets (30-day). Ranks in order:
  Rookie (0 XP) → Bronze I (1,000) → Bronze II (2,500) → Bronze III (5,000)
  → Silver I (10,000) → Silver II (18,000) → Silver III (28,000)
  → Gold I (42,000) → Gold II (60,000) → Gold III (82,000)
  → Platinum I (110,000) → Platinum II (145,000) → Platinum III (185,000)
  → Diamond I (230,000) → Diamond II (285,000) → Diamond III (350,000)
  → Legend (450,000) → Chillverse OG (600,000)
  Ranks RESET every 30 days. Players must keep earning XP to maintain rank.
- Rank Rewards: Nothing at Rookie/Bronze/Silver. At Gold I: Gold Spark Badge.
  Platinum I: Exclusive Platinum profile pic. Diamond I: Diamond album pic.
  Diamond III: Cyan diamond name glow in all chats. Legend: Fiery profile
  border glow + Legend profile pic. Chillverse OG: Free mall pick + gold name
  glow + OG album pic (rarest in the game, under 1% of players).
- Achievements: Milestone tracker across XP, streaks, games, social, rank,
  and special categories. Unlocking achievements grants XP rewards.
- Weekly Missions: Short-term tasks that reset every week. Faster XP source
  than achievements. Complete them for XP and diamond rewards.
- Mall: Shop for profile pics, album pics, banners, consumables, and more.
  Costs diamonds. New featured items rotate every 2 days.
- Inventory: Items you've purchased or earned from the mall or rank rewards.
- Wallet: Diamond balance and transaction history.
- Buy Diamonds: Purchase diamonds using real money or in-game methods.
- Gift: Send mall items or diamonds to other players via their username or
  their wishlist on their profile.
- Profile: Your public showcase. Shows XP, rank, achievements, album, bio,
  country, play time, favorite game. Other players can view your profile
  and challenge you from here.
- Chat: Public global chat and private 1-on-1 chats. Name glows from rank
  rewards are visible here. Be careful — accounts can be flagged for bad behavior.
- Challenges: Challenge other players to head-to-head mini-game battles.
  Initiated via opponent's profile page.
- Exploration: Explore maps to find rare artifact items for your profile.
  Some artifacts require Void plan.
- Artifacts: Rare collectible items found through exploration. Displayed on
  your profile for recognition and flex.
- Watch: Curated YouTube and video content section. Earn XP for watching.
- Notifications: In-app alerts for achievements, challenges, rank changes, gifts.
- Settings: Change username, view app info, logout.
- Version (upgrade system): Players can upgrade their Chillverse version
  using diamonds. Each version unlocks more features:
  v1.0 = Free (base experience)
  v2.0 = Animations (1,900 diamonds)
  v3.0 = More Games (3,900 diamonds)
  v4.0 = Higher Sessions — up to 19 sessions instead of standard limit (5,900 diamonds)
  v5.0 = Special Cosmetics & Badges (final tier, coming soon)

ECONOMY:
- Sessions: Daily gameplay currency (resets daily). Each game play costs
  sessions. Standard games cost 1 session. Hangman costs 3, Close Call costs 4,
  Trivia Clash costs 6. Default limit is 15 sessions/day. v4.0 raises this
  to 19. Tac Zone is free/unlimited.
- XP: Earned from games, missions, achievements, watching content, daily streaks.
  1,000 XP = 1 level. Used for rank progression.
- Diamonds (gems): Premium currency. Used for mall purchases, version upgrades,
  and gifting. Purchased with real money or earned via special events.
- Levels: Every 1,000 XP = 1 level. Displayed on profile and dashboard.

GAMES CATALOG:
- Arrow Dash: Tap the correct arrow direction fast. 1 session.
- Pattern Memory: Watch a sequence, repeat it. 1 session.
- Anime Trivia (shown as "Rapid Sort"): Anime knowledge quiz with shrinking
  time as streak grows. 1 session.
- Tac Zone: Tic-tac-toe style. Three in a row. UNLIMITED free plays.
- Two Truths, One False: Spot the lie among three claims. 1 session.
- Speed Math: Solve equations as fast as possible. 1 session.
- Liar's Grid: Find the one wrong equation in a grid. 1 session.
- Trivia Clash: General knowledge quiz, competitive scoring. 6 sessions.
- Hangman: Guess the word letter by letter. 3 sessions.
- Close Call: Type the closest answer as fast as possible. 4 sessions.

HALO AI ITSELF:
- Free players: 5 Halo messages/day
- Players on version 3.0 or 4.0: 25 messages/day
- Players on version 5.0 (Void/Max): Unlimited
- You are powered by Google Gemini and live inside the Dashboard.

=== RESPONSE RULES ===
- Always address the player by their display name or username.
- Keep responses concise — under 180 words unless a detailed breakdown is needed.
- Use encouraging, hype-coach energy. Celebrate progress. Be direct.
- If the player asks something outside Chillverse (unrelated topics), gently
  redirect: "I'm all about Chillverse — ask me anything about the game!"
- Never say "I cannot", "I don't have access", or "as an AI". Just be Halo.
- Personalize answers using the player context you receive (their rank,
  level, XP, streak, version level).`

interface PlayerContext {
  username: string
  displayName: string | null
  xp: number
  level: number
  streak: number
  version_level: number
  rank: string
}

interface HaloRequestBody {
  message: string
  playerContext: PlayerContext
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: CORS_HEADERS })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // ── Auth: verify the Supabase JWT from the Authorization header ──
    const authHeader = req.headers.get('Authorization') ?? ''
    const jwt = authHeader.replace('Bearer ', '').trim()

    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    })

    const { data: userData, error: userError } = await authClient.auth.getUser(jwt)
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // ── Input validation ──
    const body: HaloRequestBody = await req.json()
    const { message, playerContext } = body

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    if (message.length > 500) {
      return new Response(JSON.stringify({ error: 'Message exceeds 500 characters' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    if (!playerContext) {
      return new Response(JSON.stringify({ error: 'playerContext is required' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // ── Build Gemini request ──
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: 'AI unavailable' }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const contextLine =
      `Player: ${playerContext.displayName || playerContext.username}\n` +
      `Level: ${playerContext.level} | XP: ${playerContext.xp} | Streak: ${playerContext.streak} days | ` +
      `Rank: ${playerContext.rank} | Version: ${playerContext.version_level}\n\n` +
      `Question: ${message}`

    const geminiBody = {
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: contextLine }],
        },
      ],
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: 300,
        topP: 0.9,
      },
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody),
      }
    )

    if (!geminiRes.ok) {
      return new Response(JSON.stringify({ error: 'AI unavailable' }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const geminiData = await geminiRes.json()
    const reply: string | undefined =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!reply) {
      return new Response(JSON.stringify({ error: 'AI unavailable' }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
