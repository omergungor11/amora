# AI Dating App (Amora) — Design & Roadmap

> Started 2026-05-30 · Living doc · Parent strategy: `../../../PLAN.md`

## Concept (locked)

Beautiful, animation-heavy swipe dating app where profiles are **AI-generated
characters** (Claude/Gemini-powered). Differentiators:

1. **Premium animated UI** — the product's star.
2. **AI characters** solve cold-start (always someone to swipe/chat).
3. **AI "Taste Coach"** — watches swipe choices, learns the user's type,
   personalizes the deck, surfaces light insights.

Web-first → mobile (Expo) later. 18+ gate, clear "this is AI" labeling,
self-harm protocols from day 1.

## Core loop

Onboarding → Swipe (animated cards, AI profiles) → Match (celebration) →
Chat (in-character, Gemini) → Taste Coach (background personalization).

---

## Status (as of 2026-05-31)

### ✅ Done

- **Swipe deck** — drag/rotation/LIKE-NOPE overlays, fling, 3-card stack, HQ
  Unsplash portraits, image fade-in.
- **Match** — cinematic modal (confetti burst, bloom, glow ring).
- **Chat** — free **Google Gemini 2.5 Flash** via OpenAI-compatible endpoint
  (`server/index.ts`), thinking disabled, server-side key. Anthropic kept as
  fallback (`CHAT_PROVIDER`).
- **Per-character voice** — structured `style` card (`texting/topics/quirks/
  flirt`) per character → built into the system prompt. Distinct, consistent
  voices verified.
- **Style-driven opener** — character sends the first message in its own voice
  (`/api/opener`), shown with a "typing" bubble; graceful canned fallback.
- **AI Taste Coach v1**
  - Learning: weighted tag affinity (super-like 2×), pass = mild negative.
  - **Deck personalization**: unseen cards ranked by compatibility + learned
    affinity + stable jitter.
  - Insights: local themed insight + AI-written read (`/api/coach`) every 4 likes.
- **User profile**
  - Onboarding required-only: photo, name, birth date, interestedIn; 18+ gate.
  - Profile tab: header (zodiac + approx. rising via `lib/astro.ts`),
    "Senin Tipin" card, optional sections (astrology, about, lifestyle, values,
    animals, personality), settings. `useProfile` + **localStorage persistence**.
- **Profile → deck affinity** — `lib/compatibility.ts` scores profile↔character
  fit (interest overlap, animals, politics, religion, kids, lifestyle, social
  energy) from structured character `traits`; folded into deck ranking + a
  "%uyum" hint on cards. Better cold-start.

### Tech

- Vite + React 19 + TS, Tailwind v4, Motion, Zustand (+persist).
- Express proxy server (`server/`) → Gemini (OpenAI SDK). Endpoints:
  `/api/chat`, `/api/opener`, `/api/coach`, `/api/health`.

---

## Roadmap (next)

### Phase A — deepen the AI (near-term)
- [x] **Chat reads the user profile** — sends a tasteful user snapshot (name,
      age, interests, lookingFor, bio); server adds a "# EŞLEŞTİĞİN KİŞİ"
      section and highlights shared interests so characters reference common
      ground naturally. Sensitive fields (politics/religion) omitted.
- [x] **Coach reads profile + swipes together** — `/api/coach` blends swipe
      themes with the user's own interests/goals for a richer "type" read.
- [x] Opener uses profile context (shared-interest hook in the instruction).
- [x] **Compatibility breakdown on tap** — `compatBreakdown()` + tappable
      "%uyum" chip lists which dimensions match (interests, values, animals…).
- [x] 429 resilience — `withRetry` backoff on rate-limited model calls.
- [ ] Tune compatibility weights with real usage data.

### Phase B — backend & persistence
- [ ] Supabase: auth, profiles, matches, messages (replace in-memory stores).
- [ ] Move character generation server-side (Claude/Gemini) + image model.
- [ ] Real taste model over swipe history (pgvector).
- [ ] Cost controls: caching, rate-limit handling (free-tier 15 RPM guardrails).

### Phase C — product
- [ ] Daily deck limits / boosts (monetization stubs → Stripe).
- [ ] Notifications, read receipts, richer chat (images, reactions).
- [ ] Mobile (Expo) wrapper; move web into `apps/web/`.

### Out (YAGNI for now)
Human↔human matching, video/voice profiles, UGC characters, marketplace.

---

## Known constraints
- Gemini free tier: 15 RPM — bursts (rapid matches + coach) can 429; all paths
  degrade to graceful fallbacks. Add retry/backoff or queue in Phase B.
- Rising sign is a time-based approximation, not an ephemeris result.
- All state except the profile is in-memory (lost on refresh) until Supabase.
