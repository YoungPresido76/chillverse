// src/shared/content/faq.ts
//
// Single source of truth for FAQ copy. Landing.tsx shows the first 7 (the
// "quick" set most relevant to a first-time visitor); the standalone /faq
// page shows the full list. Keeping one array means the homepage's visible
// FAQ text and its FAQPage JSON-LD never drift apart — and the new /faq
// page automatically inherits anything added here.

export interface FaqItem {
  q: string
  a: string
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    q: 'What is Chillverse?',
    a: 'Chillverse is a Nigerian mobile-first social gaming platform where you play fast-paced games, build XP and daily streaks, climb live leaderboards, chat with friends, and customise your profile with unlockable avatar skins from the in-app Mall.',
  },
  {
    q: 'Is Chillverse free to use?',
    a: 'Yes — Chillverse is completely free to join and play. Core features like games, streaks, leaderboards, chat, and profiles cost nothing. The Mall lets you optionally spend in-app diamonds on cosmetic avatar skins.',
  },
  {
    q: 'What games can I play on Chillverse?',
    a: 'Chillverse has a growing library of quick-fire mini games, including Whot (the classic Nigerian card game) and Colour Block, with more titles being added regularly. Games support solo play and live multiplayer sessions.',
  },
  {
    q: 'How does XP and the streak system work?',
    a: 'Every game you play earns XP, which levels up your account and moves you up the global leaderboard. Logging in and playing daily builds your streak — miss a day and your streak resets, so consistency matters.',
  },
  {
    q: 'Can I chat with friends on Chillverse?',
    a: 'Yes. Chillverse has real-time chat and crew features so you can message friends, trash talk during matches, and stay connected with your community directly in the app.',
  },
  {
    q: 'Does Chillverse have content for kids?',
    a: 'Yes — Chillverse includes a dedicated kids video section with curated, family-friendly content, separate from the main gaming and social features.',
  },
  {
    q: 'How do I get started on Chillverse?',
    a: 'Sign up for free at chillverse.com.ng, set up your profile, and jump straight into a game. You start earning XP and building your streak from your very first session.',
  },
  {
    q: 'What are Diamonds and what can I spend them on?',
    a: "Diamonds are Chillverse's in-app currency, purchasable with real money. You can spend them in the Mall on cosmetic avatar skins and profile items, or use them to unlock optional Version upgrades — none of it affects gameplay or your rank.",
  },
  {
    q: 'What is Chillverse Pro?',
    a: 'Chillverse Pro is an optional recurring subscription with two tiers, Orbit and Void, that unlock extra perks on top of the free experience. It auto-renews until cancelled, and any price change is notified in advance of your next renewal.',
  },
  {
    q: 'Can I refer friends to Chillverse?',
    a: "Yes — Chillverse has a built-in referral program. You'll find your referral link from the Refer & Earn option on your profile.",
  },
  {
    q: 'How do I delete my Chillverse account?',
    a: 'You can request account deletion at any time. Some records may be retained briefly for legal or safety purposes, but they are no longer linked to your identity. See the Privacy Policy for full details.',
  },
  {
    q: 'What is Halo AI?',
    a: "Halo AI is Chillverse's built-in assistant — ask it questions about the platform or your own account activity. It's automated, so treat its answers as general information rather than professional advice, and usage has a daily limit that can vary by Version tier.",
  },
]
