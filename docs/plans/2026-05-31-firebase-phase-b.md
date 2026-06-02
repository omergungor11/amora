# Phase B — Firebase Persistence & Auth (Design)

> 2026-05-31 · Decisions: **Google OAuth + anonymous-first**, on **Firebase**
> (Firestore + Firebase Auth). Status: client+session done (null-safe), store
> migration pending. (Replaces the earlier Supabase design — same data model,
> different backend.)

## Why Firebase

The chosen auth model fits Firebase natively: anonymous sign-in and
**anonymous → Google linking** (`linkWithPopup`, same uid) are first-class. Google
OAuth is trivial (it's Google). Generous free tier (Spark), no card. Trade-off vs
Supabase: Firestore is **NoSQL** (collections/documents) and uses **Security
Rules** instead of SQL + RLS — fine here since taste/compat logic is client-side.

## Auth flow — anonymous-first → Google

```
App load → ensureSession()
  ├─ persisted user → use it (anon or google)
  └─ none → signInAnonymously()  → anon user (stable uid)
Onboarding → users/{uid} profile doc
Swipe / match / chat → docs under users/{uid}
"Hesabını kaydet" (Profil > Ayarlar)
  └─ linkWithPopup(currentUser, Google)  → same uid, all data preserved
Other device:
  signInWithPopup(Google) → same Google identity → same uid → data syncs
```

`linkGoogle()` (src/lib/session.ts) already implements this, including the
`auth/credential-already-in-use` fallback to a plain Google sign-in.

## Data model (Firestore)

Single subtree per user → one security rule covers all of it:

```
users/{uid}                                   profile doc (UserProfile fields)
users/{uid}/swipes/{characterId}              { direction, createdAt }
users/{uid}/matches/{characterId}             { createdAt }
users/{uid}/matches/{characterId}/messages/*  { role, content, createdAt }
```

- doc id = characterId (e.g. `'w1'`) for swipes/matches → natural dedupe + upsert.
- **Characters stay in code** (`data/characters.ts`); referenced by id only.
- **Taste is derived** from swipes (join id → code tags client-side) — no extra docs.
- **Photo**: v1 stores the data URL on the profile doc. Firestore doc limit is
  1 MB, so downscale the image on upload (canvas) before storing — or use Firebase
  Storage later. (Add: cap the data URL size in onboarding.)

### Security rules — `firestore.rules`
```
match /users/{uid}/{document=**} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```
Anonymous users have a real `request.auth.uid`, so they're covered identically.

## Client integration plan

1. ✅ **`src/lib/firebase.ts`** — null-safe `auth` / `db` from VITE_FIREBASE_*.
2. ✅ **`src/lib/session.ts`** — `ensureSession()` (anonymous-first),
   `linkGoogle()`, `currentUserId()`, `isAnonymous()`.
3. **`useProfile` ↔ `users/{uid}`** — load on session; create/update write through
   (keep localStorage as offline cache / fallback when `db` is null).
4. **swipes ↔ `users/{uid}/swipes`** — `useTaste.record()` also upserts a swipe
   doc; on load, hydrate taste by replaying swipes against code-side tags; seed
   deck `seen` from existing swipes (cross-session dedupe).
5. **`useMatches` ↔ `matches` + `messages`** — load on session; `addMatch`,
   `appendUser`, `finishCharacterReply`, `resolveOpener` write through.
6. **Auth UI** — "Hesabını Google ile kaydet" in Profil > Ayarlar (`linkGoogle`);
   show linked email when permanent; "Google ile giriş" for returning users.
7. Verify end-to-end on a real project; handle the already-linked edge.

All steps remain no-ops when `db`/`auth` are null (no project configured).

## Env & setup checklist (user does once)

`.env` (frontend, public — safe to expose):
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=<project>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<project>
VITE_FIREBASE_APP_ID=...
```

Firebase Console:
1. Create a project → add a **Web app** → copy the config into `.env`.
2. **Build → Authentication → Sign-in method**: enable **Anonymous** and **Google**.
3. **Authentication → Settings → Authorized domains**: ensure `localhost` is listed.
4. **Build → Firestore Database**: create (production mode).
5. Publish `firestore.rules` (Console rules editor or `firebase deploy --only firestore:rules`).

## Status

- [x] Step 1 — null-safe Firebase client (`lib/firebase.ts`)
- [x] Step 2 — anonymous-first `ensureSession()` + startup wiring; `linkGoogle()`
- [x] Step 3 — profile ↔ `users/{uid}` (write-through + hydrate). **Verified live**
- [x] Step 4 — swipes ↔ `swipes` + taste hydration + cross-session deck dedupe
- [x] Step 5 — matches/messages ↔ Firestore (write-through + hydrate). **Verified live**
- [x] Step 6 — Google link UI in Profil > Ayarlar (`linkGoogle`, anon/linked state)
- [x] Step 7 — live round-trip verified on project `date-app-37fce` (profile,
      match, and messages all survive a localStorage wipe + reload)

Implementation files: `lib/firebase.ts`, `lib/session.ts`, `lib/db.ts`,
`lib/sync.ts`, `lib/useAuth.ts`; stores `useProfile`/`useTaste`/`useMatches`
wired write-through; `firestore.rules`. Everything no-ops when Firebase is off.

### Follow-ups (later)
- Realtime listeners (onSnapshot) for multi-device live sync (now load-on-start).
- Downscale photo before storing (Firestore 1 MB doc limit) or move to Storage.
- "Çıkış" should `signOut()` for linked users; anonymous sign-out is irreversible.
- Sign-in entry for returning Google users on a fresh device (linkGoogle already
  falls back to sign-in, but a dedicated pre-onboarding button would be clearer).
