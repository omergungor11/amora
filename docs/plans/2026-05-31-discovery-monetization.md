# Discovery, Matching Engine & Monetization (Compact Plan)

> 2026-05-31 · Next-gen, compatibility-first dating app with AI characters and a
> freemium model. Builds on: profiles, Taste Coach, profile→deck affinity,
> Firebase persistence, multi-photo user profiles.

## Feature set (from product notes)

1. **Richer cards** — multi-photo gallery on swipe cards (Tinder-style tap-through).
2. **Location** — capture user lat/lng (geolocation + manual fallback); characters
   have coordinates → real distance.
3. **Distance filter** — adjustable 5–200 km.
4. **Age range filter** — adjustable min/max.
5. **Preferences** — gender, "looking for", + the above, in one Discovery sheet.
6. **Matching engine** — rank deck by compatibility (✓ have) + distance + prefs;
   store user data for comparison. Hard filters (gender/age/distance) gate the
   pool; soft scores order it.
7. **Daily like limit** — free tier capped (e.g. 30/day, resets daily); next-gen
   twist: quality-over-quantity nudges, not just a hard wall.
8. **Super-likes / boosts economy** — "Süper Beğeni", "Çok Kalp", "Boost" as
   consumable credits; buy packs (3 / 5 / 15) or subscribe (Premium = unlimited).
9. **Advanced filters (paid)** — filter by values/lifestyle/interests; see-who-
   liked-you; unlimited likes — gated behind Premium.

## Phasing

### P1 — Discovery & richer cards  ✅ DONE
- [x] Characters get a themed multi-photo gallery; SwipeCard tap-through UI
      (progress bars + left/right tap zones). `data/themePhotos.ts`.
- [x] Location capture (geolocation + manual city) → profile lat/lng. `lib/location.ts`.
- [x] Character coordinates + haversine distance (`lib/geo.ts`); real "· N km".
- [x] Discovery sheet (`DiscoverySheet.tsx`): distance 5–200 km, age range,
      gender, looking-for; opened via 🎚️ on the swipe header.
- [x] Deck hard-filters by gender/age/distance; soft-ranks by
      compatibility + affinity + closeness bonus + jitter.

### P2 — Economy (likes & super-likes)  ✅ DONE
- [x] `useEconomy` store: daily like quota (reset at local midnight via day stamp),
      super-like + boost credits, premium flag — persisted (localStorage +
      Firestore `users/{uid}/meta/economy`, hydrated in `sync.ts`).
- [x] Enforce in deck/ActionBar: out of likes → `UpsellSheet`; super-like spends a
      credit; gate covers both the button path (SwipeDeck) and drag path
      (SwipeCard `canSwipe`/`onBlocked`). Remaining counts on the action bar +
      a store strip above the deck.
- [x] Stubbed purchase packs (Süper Beğeni 3/5/15, Boost 1/5) + Premium toggle
      (grants unlimited likes + 5 super-likes; no real payment — Stripe in P4).

### P3 — Premium & advanced filters  ✅ DONE
- [x] Premium flag gates: advanced filters, unlimited likes (P2), see-who-liked.
- [x] Advanced filter UI (`AdvancedFilters.tsx`: lifestyle/values/interests, multi-
      select) inside the Discovery sheet — blurred + lock overlay → upsell when
      free; applied as a hard gate in the deck (`passesFilters`) for Premium.
- [x] "Seni Beğenenler" (`LikedYouSheet.tsx`): top-compat unseen characters; free
      = blurred teaser + count, Premium = real cards, tap = instant mutual match
      → chat. Opened via 💜 in the swipe header.
- [x] Plan comparison table (Free vs Premium) in `UpsellSheet`.

### P4 — Real payments
- [ ] Stripe (or RevenueCat for mobile) wiring; webhook → entitlement; restore.

## Matching engine (design)

Pool = characters matching **hard filters**: gender (interestedIn), age in
[ageMin,ageMax], distance ≤ distanceKm. Order = **soft score**:
`compatibility(profile,char)·0.7 + tasteAffinity(char) + distanceBonus + jitter`,
where distanceBonus rewards closer matches. Already-swiped excluded (persisted
`seen`). User swipe/profile data persisted (Firestore) feeds the Taste Coach and
future server-side matching.

## Monetization summary

| Item | Free | Premium |
|------|------|---------|
| Likes / day | ~30 | Unlimited |
| Süper Beğeni | buy packs (3/5/15) | monthly allowance |
| Çok Kalp / Boost | buy packs | included |
| Advanced filters | locked | unlocked |
| See who liked you | locked | unlocked |

Payments stubbed until P4; the UI, credits, and entitlement gating are real so
the flows are testable now.
