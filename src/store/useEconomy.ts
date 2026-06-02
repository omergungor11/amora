import { create } from "zustand";
import { persist } from "zustand/middleware";
import { saveEconomy, type EconomyRow } from "../lib/db";

/**
 * The freemium economy: a daily like quota (free tier) plus consumable
 * "Süper Beğeni" / "Boost" credits and a Premium flag. Persisted to
 * localStorage and written through to Firestore (no-op when disabled), the
 * same pattern as the profile store.
 *
 * Quota resets at LOCAL midnight: we stamp the day and roll the counter over
 * whenever the stamp no longer matches today's date.
 */
const FREE_LIKE_LIMIT = 30;
const PREMIUM_SUPERLIKES = 5; // monthly allowance granted on subscribe

/** Local calendar day, e.g. "2026-06-02" (en-CA gives YYYY-MM-DD). */
function today(): string {
  return new Date().toLocaleDateString("en-CA");
}

type EconomyState = EconomyRow & {
  /** likes remaining today (Infinity for Premium) */
  likesLeft: () => number;
  canLike: () => boolean;
  /** consume one daily like (no-op for Premium) */
  spendLike: () => void;
  /** consume one Süper Beğeni; false when none left */
  spendSuperLike: () => boolean;
  spendBoost: () => boolean;
  addSuperLikes: (n: number) => void;
  addBoosts: (n: number) => void;
  setPremium: (on: boolean) => void;
  hydrate: (row: Partial<EconomyRow>) => void;
};

function row(s: EconomyRow): EconomyRow {
  return {
    likeLimit: s.likeLimit,
    likesUsedToday: s.likesUsedToday,
    dayStamp: s.dayStamp,
    superLikes: s.superLikes,
    boosts: s.boosts,
    premium: s.premium,
  };
}

export const useEconomy = create<EconomyState>()(
  persist(
    (set, get) => ({
      likeLimit: FREE_LIKE_LIMIT,
      likesUsedToday: 0,
      dayStamp: today(),
      superLikes: 1, // one freebie to discover the feature
      boosts: 0,
      premium: false,

      likesLeft: () => {
        const s = get();
        if (s.premium) return Infinity;
        // a stale stamp means today's quota is fresh again
        const used = s.dayStamp === today() ? s.likesUsedToday : 0;
        return Math.max(0, s.likeLimit - used);
      },

      canLike: () => get().premium || get().likesLeft() > 0,

      spendLike: () => {
        const s = get();
        if (s.premium) return;
        const t = today();
        // fold a pending midnight rollover into this spend
        const used = (s.dayStamp === t ? s.likesUsedToday : 0) + 1;
        const next = { ...s, dayStamp: t, likesUsedToday: used };
        set({ dayStamp: t, likesUsedToday: used });
        void saveEconomy(row(next));
      },

      spendSuperLike: () => {
        const s = get();
        if (s.superLikes <= 0) return false;
        const next = { ...s, superLikes: s.superLikes - 1 };
        set({ superLikes: next.superLikes });
        void saveEconomy(row(next));
        return true;
      },

      spendBoost: () => {
        const s = get();
        if (s.boosts <= 0) return false;
        const next = { ...s, boosts: s.boosts - 1 };
        set({ boosts: next.boosts });
        void saveEconomy(row(next));
        return true;
      },

      addSuperLikes: (n) => {
        const next = { ...get(), superLikes: get().superLikes + n };
        set({ superLikes: next.superLikes });
        void saveEconomy(row(next));
      },

      addBoosts: (n) => {
        const next = { ...get(), boosts: get().boosts + n };
        set({ boosts: next.boosts });
        void saveEconomy(row(next));
      },

      setPremium: (on) => {
        const s = get();
        const superLikes = on ? Math.max(s.superLikes, PREMIUM_SUPERLIKES) : s.superLikes;
        const next = { ...s, premium: on, superLikes };
        set({ premium: on, superLikes });
        void saveEconomy(row(next));
      },

      hydrate: (incoming) => {
        set((s) => {
          const merged = { ...s, ...incoming };
          const t = today();
          if (merged.dayStamp !== t) {
            merged.dayStamp = t;
            merged.likesUsedToday = 0;
          }
          return {
            likeLimit: merged.likeLimit,
            likesUsedToday: merged.likesUsedToday,
            dayStamp: merged.dayStamp,
            superLikes: merged.superLikes,
            boosts: merged.boosts,
            premium: merged.premium,
          };
        });
      },
    }),
    { name: "amora-economy" },
  ),
);
