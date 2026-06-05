import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import SwipeCard, { type SwipeCardHandle } from "./SwipeCard";
import ActionBar from "./ActionBar";
import MatchModal from "./MatchModal";
import UpsellSheet, { type UpsellContext } from "./UpsellSheet";
import { characters } from "../data/characters";
import { useTaste } from "../store/useTaste";
import { useMatches } from "../store/useMatches";
import { useProfile } from "../store/useProfile";
import { useEconomy } from "../store/useEconomy";
import { generateOpener } from "../lib/reply";
import { generateInsight } from "../lib/coach";
import {
  scoreProfileMatch, compatPercent, hasSignal, compatBreakdown, passesFilters,
} from "../lib/compatibility";
import { distanceKm as geoDistance } from "../lib/geo";
import { loadCandidates, sendLike } from "../lib/db";
import { useAuth } from "../lib/useAuth";
import { profileToCard } from "../lib/deck";
import { isAICard, type Character, type InterestedIn, type SwipeDir } from "../types";

const VISIBLE = 3; // cards rendered in the stack

type Props = {
  interestedIn: InterestedIn;
  onOpenChat: (characterId: string) => void;
};

// Stable per-id jitter in [0,1) so equal-affinity cards keep a pleasant,
// shuffle-like order that doesn't re-randomize on every render.
function jitter(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 9973;
  return h / 9973;
}

export default function SwipeDeck({ interestedIn, onOpenChat }: Props) {
  const [matched, setMatched] = useState<Character | null>(null);
  const topRef = useRef<SwipeCardHandle>(null);
  const record = useTaste((s) => s.record);
  const insight = useTaste((s) => s.insight);
  const affinity = useTaste((s) => s.affinity);
  const topTags = useTaste((s) => s.topTags);
  const likes = useTaste((s) => s.likes);
  // already-swiped ids (persisted) → deck dedupe across sessions
  const seen = useTaste((s) => s.seen);
  const clearSeen = useTaste((s) => s.clearSeen);
  // re-rank the deck whenever the taste profile changes
  const tasteTick = useTaste((s) => s.likes + s.passes);
  const addMatch = useMatches((s) => s.addMatch);
  const addRealMatch = useMatches((s) => s.addRealMatch);
  const resolveOpener = useMatches((s) => s.resolveOpener);
  const profile = useProfile((s) => s.profile);
  const [aiInsight, setAiInsight] = useState<string | null>(null);

  // real user↔user discovery: pull other users' public profiles and adapt them
  // into deck cards, merged with the AI seed so the deck is never empty.
  // Gated on the auth uid — reads require auth, so fetching before the session
  // is ready would be denied (and return empty).
  const authUid = useAuth().user?.uid;
  const [realCards, setRealCards] = useState<Character[]>([]);
  useEffect(() => {
    if (!authUid) return;
    loadCandidates()
      .then((rows) => setRealCards(rows.map(profileToCard)))
      .catch(() => setRealCards([]));
  }, [authUid]);

  // economy: daily like quota + Süper Beğeni credits + Premium. Subscribe to the
  // raw fields so the action-bar counters re-render as they change.
  const premium = useEconomy((s) => s.premium);
  const superLikes = useEconomy((s) => s.superLikes);
  // likesLeft() reads likesUsedToday, so this selector re-runs as likes are spent
  const likesLeft = useEconomy((s) => s.likesLeft());
  const canLike = useEconomy((s) => s.canLike);
  const spendLike = useEconomy((s) => s.spendLike);
  const spendSuperLike = useEconomy((s) => s.spendSuperLike);
  const [upsell, setUpsell] = useState<UpsellContext | null>(null);

  // can this swipe direction be afforded right now?
  function affords(dir: SwipeDir): boolean {
    if (dir === "like") return canLike();
    if (dir === "superlike") return superLikes > 0;
    return true; // pass is always free
  }

  // why a blocked swipe can't go through → which upsell to show
  function blockContext(dir: SwipeDir): UpsellContext {
    return dir === "superlike" ? "superlike" : "likes";
  }

  // AI Taste Coach: every few likes, ask the model for a warm read on the
  // user's type. Falls back to the local template insight if unavailable.
  useEffect(() => {
    if (likes >= 4 && likes % 4 === 0) {
      generateInsight(topTags(3)).then((t) => t && setAiInsight(t));
    }
  }, [likes, topTags]);

  const pool = useMemo(() => {
    const want =
      interestedIn === "everyone"
        ? null
        : interestedIn === "women"
          ? "woman"
          : "man";
    // real users first, AI seed fills the rest
    const all = [...realCards, ...characters];
    return want ? all.filter((c) => c.gender === want) : all;
  }, [interestedIn, realCards]);

  // distance in km from the user to a character, or null when either side has
  // no location (real users may not have shared one yet)
  const userLoc =
    profile?.lat != null && profile?.lng != null
      ? { lat: profile.lat, lng: profile.lng }
      : null;
  function coordsOf(c: Character): { lat: number; lng: number } | null {
    return c.lat != null && c.lng != null ? { lat: c.lat, lng: c.lng } : null;
  }
  function distanceOf(c: Character): number | null {
    const cc = coordsOf(c);
    return userLoc && cc ? Math.round(geoDistance(userLoc, cc)) : null;
  }

  // Matching engine: HARD filters gate the pool (gender ✓, age, distance);
  // SOFT score orders it (compatibility + learned affinity + closeness + jitter).
  const queue = useMemo(() => {
    const ageMin = profile?.ageMin ?? 18;
    const ageMax = profile?.ageMax ?? 80;
    const maxKm = profile?.distanceKm ?? 100;

    const eligible = pool.filter((c) => {
      if (seen.includes(c.id)) return false;
      if (c.age < ageMin || c.age > ageMax) return false;
      const cc = coordsOf(c);
      if (userLoc && cc && geoDistance(userLoc, cc) > maxKm) return false;
      // Premium advanced filters (values/lifestyle/interests) as a hard gate
      if (premium && profile && !passesFilters(profile, c)) return false;
      return true;
    });

    return eligible
      .map((c) => {
        const compat = profile ? scoreProfileMatch(profile, c) * 0.7 : 0;
        const cc = coordsOf(c);
        const d = userLoc && cc ? geoDistance(userLoc, cc) : null;
        const closeness = d != null ? (1 - Math.min(d, maxKm) / maxKm) * 2 : 0;
        return { c, key: compat + affinity(c) + closeness + jitter(c.id) };
      })
      .sort((a, b) => b.key - a.key)
      .map((x) => x.c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, seen, tasteTick, profile, premium]);

  const remaining = queue.slice(0, VISIBLE);

  // gate the action-button path; the drag path is gated inside SwipeCard
  function tryAction(dir: SwipeDir) {
    if (!affords(dir)) return setUpsell(blockContext(dir));
    topRef.current?.fling(dir);
  }

  function handleSwipe(char: Character, dir: SwipeDir) {
    // spend the economy resource (gate already guaranteed affordability)
    if (dir === "like") spendLike();
    else if (dir === "superlike") spendSuperLike();
    record(char, dir); // updates taste + adds to `seen` + persists the swipe

    // ── real user: write a directional like; match only if reciprocal ──
    if (!isAICard(char)) {
      if (dir === "like" || dir === "superlike") {
        sendLike(char.id, dir).then((matchId) => {
          if (!matchId) return; // they haven't liked back (yet)
          addRealMatch(char, matchId); // shared thread, no AI opener
          setMatched(char);
        });
      }
      return;
    }

    // ── AI seed: simulated match + Gemini opener (superlike always, like ~60%) ──
    const isMatch = dir === "superlike" || (dir === "like" && Math.random() < 0.6);
    if (isMatch) {
      addMatch(char);
      setMatched(char);
      // generate the style-driven opener in the background; the chat shows a
      // "typing" bubble until it resolves.
      generateOpener(char).then((text) => resolveOpener(char.id, text));
    }
  }

  const deckEmpty = queue.length === 0;
  const showCompat = profile ? hasSignal(profile) : false;
  // prefer the AI-written read; fall back to the local template insight
  const currentInsight = aiInsight ?? insight();

  return (
    <div className="flex h-full flex-col">
      {/* economy strip — balances + store entry */}
      <button
        onClick={() => setUpsell("store")}
        className="mx-auto mb-2 flex items-center gap-3 rounded-full bg-white/5 px-4 py-1.5 text-sm ring-1 ring-white/10 active:scale-95"
      >
        <span className="text-emerald-300">
          ♥ {likesLeft === Infinity ? "∞" : likesLeft}
        </span>
        <span className="text-white/20">·</span>
        <span className="text-sky-300">⭐ {superLikes}</span>
        {premium && <span className="text-violet-300">👑</span>}
        <span className="ml-1 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-2 py-0.5 text-xs font-semibold">
          Mağaza
        </span>
      </button>

      {/* coach insight banner */}
      <AnimatePresence>
        {currentInsight && !deckEmpty && (
          <motion.div
            key={currentInsight}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-auto mb-3 max-w-md rounded-2xl bg-white/10 px-4 py-2 text-center text-sm text-white/85 ring-1 ring-white/10 backdrop-blur-md"
          >
            🧭 Koç: {currentInsight}
          </motion.div>
        )}
      </AnimatePresence>

      {/* card stack */}
      <div className="relative mx-auto w-full max-w-md flex-1">
        {deckEmpty ? (
          <div className="grid h-full place-items-center text-center">
            <div>
              <p className="text-2xl font-semibold">Şimdilik bu kadar 🎉</p>
              <p className="mt-2 text-white/70">
                {currentInsight ?? "Yeni karakterler yakında geliyor."}
              </p>
              <button
                onClick={() => clearSeen()}
                className="mt-6 rounded-full bg-white/10 px-6 py-3 ring-1 ring-white/15 active:scale-95"
              >
                Yeniden Karıştır
              </button>
            </div>
          </div>
        ) : (
          remaining
            .map((char, i) => (
              <SwipeCard
                key={char.id}
                ref={i === 0 ? topRef : undefined}
                character={char}
                active={i === 0}
                depth={i}
                compat={showCompat && profile ? compatPercent(profile, char) : undefined}
                compatReasons={
                  showCompat && profile ? compatBreakdown(profile, char) : undefined
                }
                distanceKm={distanceOf(char)}
                canSwipe={affords}
                onBlocked={(dir) => setUpsell(blockContext(dir))}
                onSwipe={(dir) => handleSwipe(char, dir)}
              />
            ))
            .reverse()
        )}
      </div>

      {/* actions */}
      <div className="mt-6 pb-2">
        <ActionBar
          disabled={deckEmpty}
          onAction={tryAction}
          likesLeft={likesLeft}
          superCount={superLikes}
        />
      </div>

      {upsell && <UpsellSheet context={upsell} onClose={() => setUpsell(null)} />}

      <MatchModal
        character={matched}
        onClose={() => setMatched(null)}
        onChat={() => {
          const id = matched?.id;
          setMatched(null);
          if (id) onOpenChat(id);
        }}
      />
    </div>
  );
}
