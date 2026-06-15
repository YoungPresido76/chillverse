# 🎮 Chillverse

> Play. Win. Dominate. Your universe. Your rules.

React + Vite + TypeScript + Tailwind CSS, with Supabase for authentication and user profiles. Built to deploy on Netlify with Git push-to-deploy.

---

## 📁 Project Structure

```
chillverse/
├── index.html              ← Vite entry point
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── netlify.toml             ← Netlify build & redirect config
├── .env.example              ← Copy to .env.local and fill in Supabase keys
├── supabase/
│   └── schema.sql            ← Run this in Supabase SQL editor
└── src/
    ├── main.tsx
    ├── App.tsx                ← Routes
    ├── index.css              ← Tailwind + custom 3D scene CSS
    ├── lib/
    │   ├── supabase.ts        ← Supabase client
    │   └── auth.ts            ← signUp / signIn / OAuth / profile helpers
    ├── hooks/
    │   ├── useAuth.ts          ← session state hook
    │   └── useReveal.ts        ← scroll-reveal animations
    ├── types/
    │   └── index.ts
    ├── components/
    │   ├── Nav.tsx
    │   ├── Footer.tsx
    │   └── CubeScene.tsx       ← 3D rotating cube hero background
    └── pages/
        ├── Landing.tsx
        ├── Login.tsx
        ├── Signup.tsx          ← 3-step signup flow
        ├── ForgotPassword.tsx
        ├── Privacy.tsx
        └── Terms.tsx
```

---

## 🚀 Setup — Step by Step

### 1. Install dependencies

Open a terminal in the project folder and run:

```bash
npm install
```

### 2. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) → sign in → **New Project**
2. Name it `chillverse`, set a database password, pick a region → **Create**
3. Once it's ready, go to **Project Settings → API**
4. Copy the **Project URL** and **anon public** key

### 3. Set up environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Open `.env.local` and paste in your values:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

> ⚠️ `.env.local` is gitignored — never commit your real keys.

### 4. Set up the database

1. In Supabase, go to **SQL Editor → New query**
2. Paste the contents of `supabase/schema.sql`
3. Click **Run**

This creates the `profiles` table with Row Level Security policies for usernames, avatars, XP, streaks, and more.

### 5. (For faster testing) Disable email confirmation

By default, Supabase requires users to confirm their email before they get a session. For local testing:

1. Go to **Authentication → Providers → Email**
2. Toggle **off** "Confirm email"
3. Re-enable this before going to production

### 6. (Optional) Enable Google / Discord login

1. Go to **Authentication → Providers**
2. Enable **Google** and/or **Discord**
3. Follow Supabase's prompts to add your OAuth client ID/secret from Google Cloud Console / Discord Developer Portal
4. Add `http://localhost:5173` and your production URL to the allowed redirect URLs

### 7. Run locally

```bash
npm run dev
```

Visit `http://localhost:5173`

---

## 🚀 Deploy to Netlify

1. Push this repo to GitHub
2. In Netlify: **Add new site → Import from Git → GitHub** → select this repo
3. Netlify will read `netlify.toml` automatically:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Add your environment variables in **Site settings → Environment variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click **Deploy site**

Every push to `main` auto-deploys.

> If using Google/Discord OAuth, remember to add your live Netlify URL to Supabase's allowed redirect URLs.

---

## 🔗 Platform Branch

The Chillverse Learning branch lives at **[cvwtplatform.vercel.app](https://cvwtplatform.vercel.app/)**. It's linked from:
- The "Explore the branch" card on the landing page
- The "Chillverse Learning" option in the signup/login platform-connect step

This is a **separate platform** — Chillverse's own login/signup (powered by Supabase) is the primary auth flow for this app.

---

## 🛠️ What's Next

- [ ] Build the actual game(s) — pages/lobby, game canvas, results screen
- [ ] Wire up XP, levels, and streaks to real gameplay events
- [ ] Build a public profile page (`/u/:username`)
- [ ] Build a live leaderboard page backed by the `profiles` table
- [ ] Add a `dashboard` route users land on after login

---

## ©️ License

© 2026 Chillverse. All rights reserved.
