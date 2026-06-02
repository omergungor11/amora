import { create } from "zustand";
import type { Character, SwipeDir } from "../types";
import { characters } from "../data/characters";
import { saveSwipe, type SwipeRow } from "../lib/db";

/**
 * AI Taste Coach (milestone 1, local).
 * Silently learns the user's "type" from swipes: likes build positive tag
 * affinity (super-likes count double), passes add a mild negative signal.
 * Exposes:
 *  - affinity(char): a score used to PERSONALIZE the upcoming deck
 *  - insight():      a friendly, human-readable read on the user's taste
 * Milestone 2 swaps this for a Claude + pgvector model over real swipe history.
 */

// Map raw interest tags → warm, themed phrasings for insights.
const THEMES: Record<string, { label: string; emoji: string }> = {
  sanat: { label: "sanatçı ruhlu", emoji: "🎨" },
  çizim: { label: "yaratıcı", emoji: "✏️" },
  müzik: { label: "müzik tutkunu", emoji: "🎧" },
  konser: { label: "konser sever", emoji: "🎶" },
  vinil: { label: "nostaljik", emoji: "📀" },
  dans: { label: "hareketli", emoji: "💃" },
  sinema: { label: "sinefil", emoji: "🎬" },
  kitap: { label: "entelektüel", emoji: "📚" },
  doğa: { label: "doğa âşığı", emoji: "🌿" },
  kamp: { label: "maceracı", emoji: "🏕️" },
  tırmanış: { label: "adrenalin sever", emoji: "🧗" },
  sörf: { label: "özgür ruhlu", emoji: "🏄" },
  spor: { label: "sportif", emoji: "🏃" },
  maraton: { label: "azimli", emoji: "🥇" },
  sağlık: { label: "sağlıklı yaşam meraklısı", emoji: "🧘" },
  kahve: { label: "kahve tutkunu", emoji: "☕" },
  şarap: { label: "zarif", emoji: "🍷" },
  gurme: { label: "gurme", emoji: "🍽️" },
  yemek: { label: "yemek sever", emoji: "🍝" },
  seyahat: { label: "gezgin", emoji: "✈️" },
  fotoğraf: { label: "estetik gözü olan", emoji: "📷" },
  mimari: { label: "tasarım meraklısı", emoji: "📐" },
  teknoloji: { label: "teknoloji meraklısı", emoji: "💡" },
  oyun: { label: "oyuncu", emoji: "🎮" },
  anime: { label: "anime sever", emoji: "🌸" },
  girişim: { label: "hırslı", emoji: "🚀" },
  hayvan: { label: "hayvansever", emoji: "🐾" },
  kedi: { label: "kedi insanı", emoji: "🐱" },
  gece: { label: "gece kuşu", emoji: "🌙" },
};

function theme(tag: string): { label: string; emoji: string } {
  return THEMES[tag] ?? { label: `"${tag}"`, emoji: "✨" };
}

type TasteState = {
  tagScores: Record<string, number>;
  passScores: Record<string, number>;
  likes: number;
  passes: number;
  superlikes: number;
  /** every character id the user has already swiped → cross-session deck dedupe */
  seen: string[];
  record: (char: Character, dir: SwipeDir) => void;
  /** rebuild taste from persisted swipes (no re-write to Firestore) */
  hydrate: (rows: SwipeRow[]) => void;
  /** re-show all characters (local only; persisted swipes stay) */
  clearSeen: () => void;
  topTags: (n?: number) => string[];
  /** affinity of a candidate to the learned taste — drives deck order */
  affinity: (char: Character) => number;
  insight: () => string | null;
  reset: () => void;
};

// Pure scoring update for one swipe (no persistence) — shared by record/hydrate.
function applySwipe(s: TasteState, char: Character, dir: SwipeDir): Partial<TasteState> {
  const seen = s.seen.includes(char.id) ? s.seen : [...s.seen, char.id];
  if (dir === "pass") {
    const passScores = { ...s.passScores };
    for (const t of char.tags) passScores[t] = (passScores[t] ?? 0) + 1;
    return { passScores, passes: s.passes + 1, seen };
  }
  const weight = dir === "superlike" ? 2 : 1;
  const tagScores = { ...s.tagScores };
  for (const t of char.tags) tagScores[t] = (tagScores[t] ?? 0) + weight;
  return {
    tagScores,
    likes: s.likes + 1,
    superlikes: s.superlikes + (dir === "superlike" ? 1 : 0),
    seen,
  };
}

const byId = new Map(characters.map((c) => [c.id, c]));

export const useTaste = create<TasteState>((set, get) => ({
  tagScores: {},
  passScores: {},
  likes: 0,
  passes: 0,
  superlikes: 0,
  seen: [],

  record: (char, dir) => {
    set((s) => applySwipe(s, char, dir));
    void saveSwipe(char.id, dir); // write-through (no-op if Firebase disabled)
  },

  hydrate: (rows) =>
    set((s) => {
      let next: TasteState = {
        ...s,
        tagScores: {},
        passScores: {},
        likes: 0,
        passes: 0,
        superlikes: 0,
        seen: [],
      };
      for (const r of rows) {
        const char = byId.get(r.characterId);
        if (!char) continue;
        next = { ...next, ...applySwipe(next, char, r.direction) };
      }
      return next;
    }),

  clearSeen: () => set({ seen: [] }),

  topTags: (n = 3) => {
    const entries = Object.entries(get().tagScores);
    entries.sort((a, b) => b[1] - a[1]);
    return entries.slice(0, n).map(([t]) => t);
  },

  affinity: (char) => {
    const { tagScores, passScores } = get();
    let score = 0;
    for (const t of char.tags) {
      score += tagScores[t] ?? 0;
      score -= 0.4 * (passScores[t] ?? 0); // mild aversion to passed themes
    }
    return score;
  },

  insight: () => {
    const { likes } = get();
    if (likes < 3) return null;
    const top = get().topTags(2);
    if (top.length === 0) return null;
    const a = theme(top[0]);
    if (top.length === 1 || !get().tagScores[top[1]]) {
      return `${cap(a.label)} tiplere ilgin var gibi ${a.emoji}`;
    }
    const b = theme(top[1]);
    return `${cap(a.label)} ve ${b.label} tiplere meyilli görünüyorsun ${a.emoji}`;
  },

  reset: () =>
    set({ tagScores: {}, passScores: {}, likes: 0, passes: 0, superlikes: 0, seen: [] }),
}));

function cap(s: string): string {
  return s.charAt(0).toLocaleUpperCase("tr-TR") + s.slice(1);
}
