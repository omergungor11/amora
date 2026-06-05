# Real User-to-User Matching (Plan)

> 2026-06-05 · Pivot from "everyone is an AI character" to a real dating app
> where **real users match with each other**. AI characters stay as seed/demo
> data so the deck isn't empty while the user base is small. Builds on the
> existing Firebase (anonymous-first auth + Firestore) foundation.

## The shift

Today the deck is 18 hardcoded AI `Character`s and matching is simulated
(`superlike` always matches, `like` matches 60% via `Math.random()`). Real
users never see each other — every profile lives **private** under
`users/{uid}` (Firestore Rules deny cross-user reads), and chat is Gemini-
generated. To make real people match we need a public discovery surface,
reciprocal liking, and shared message threads.

## Critical gaps found in the current code

1. **No own-gender field.** `gender` exists on `Character` but not on
   `UserProfile`; onboarding collects only name/birthDate/photos/interestedIn.
   Required so others' `interestedIn` filter can include/exclude this user.
2. **Messages are private per user** (`users/{uid}/matches/{cid}/messages`).
   Real two-way chat needs a shared thread both participants read/write.
3. **Deck is coupled to `Character`.** SwipeCard / compatibility / SwipeDeck all
   take `Character`. Real profiles need an adapter → a card model, ideally a
   shared `DeckCard` shape (real user OR AI seed).

## Phasing

### R1 — Real profiles & discovery foundation  ✅ DONE
- [x] `gender: Gender` on `UserProfile` + required onboarding step.
- [x] Public `profiles/{uid}` collection (card-safe fields only) via `toPublic`.
- [x] Write-through: `savePublicProfile` from `useProfile` create/update + sync seed.
- [x] Firestore Rules: `profiles/{uid}` authed-read, owner-write (deployed).
- [x] `loadCandidates()` (client-side filter for MVP); gated on auth-ready in the
      deck (fixed a race where reads ran before the session → denied/empty).
- [x] `profileToCard()` adapter; real users merged ahead of AI seed. Real cards
      never show the "✨ AI Karakter" badge (`isAICard`).

### R2 — Reciprocal matching  🟡 CORE DONE
- [x] `sendLike`: write `likes/{from}_{to}`; on existing reverse like, create
      shared `matches/{matchId}` (sorted uid pair) and return its id.
- [x] Match modal fires for the second liker. Rules for likes/matches deployed.
- [x] AI seed keeps the simulated-match + Gemini flow (branched in `handleSwipe`).
- [x] `loadLikedBy()` data layer ready (query likes where to==me).
- [ ] Wire "Seni Beğenenler" to `loadLikedBy` (currently still simulated likers).
- [ ] First-liker visibility: the earlier liker only sees the match after a
      reload + real-match hydration → folds into R3.
- [ ] Deck live-refresh when new candidates register (today needs a reload).

Verified E2E with two anonymous sessions (A♀→♂, B♂→♀, both 19 so AI seed is
age-filtered out): B sees A, B likes (no match), A sees B, A likes → mutual
match modal; 0 console errors.

### R3 — Real two-way messaging
- [ ] Shared `matches/{matchId}/messages` subcollection (both participants
      read/write); message `{ from, text, createdAt }`.
- [ ] `onSnapshot` listeners for live updates (no polling; free tier OK).
- [ ] Refactor `useMatches`/`db` to support shared threads keyed by matchId,
      while AI-seed conversations keep the per-user Gemini path.
- [ ] Chat screen: real match → human messaging; AI seed → Gemini as today.

### R4 — Safety & scale
- [ ] Report / block; hide blocked users from discovery.
- [ ] Basic content moderation on profile text/photos.
- [ ] Geohash distance queries (`geofire-common`) replacing client-side filter.
- [ ] Push / unread badges (FCM) — needs Blaze for some pieces.

## Data model (target)

```
users/{uid}                      ← PRIVATE (full profile, prefs, economy)
  swipes/{targetId}              ← who I swiped + direction
profiles/{uid}                   ← PUBLIC card-safe subset (authed-read)
likes/{fromUid}_{toUid}          ← directional like (from == auth.uid)
matches/{matchId}                ← {users:[a,b]}; matchId = [a,b].sort().join('_')
  messages/{msgId}               ← shared thread (from, text, createdAt)
```

## MVP scope & caveats

- Start lean: client-side gender/age/distance filtering (fine for low volume),
  reciprocal likes, real-time messaging via listeners. Defer geohash, push,
  moderation to R4.
- All of R1–R3 fits the **free Spark plan** (Firestore reads/writes + listeners).
- AI seed characters remain to avoid an empty deck and to showcase chat; they
  use the existing simulated-match + Gemini path, clearly tagged "✨ AI".
- Verifiable now by driving **two anonymous sessions** in Playwright (user A
  likes B, B likes A → both see the match + a shared message).
- Real human accounts need Google sign-in (already wired via `linkGoogle`).
