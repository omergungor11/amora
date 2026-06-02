import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  animate,
} from "motion/react";
import type { PanInfo } from "motion/react";
import { useImperativeHandle, useMemo, useState, type Ref } from "react";
import type { Character, SwipeDir } from "../types";
import type { CompatReason } from "../lib/compatibility";
import { characterPhotos } from "../data/themePhotos";

export type SwipeCardHandle = { fling: (dir: SwipeDir) => void };

type Props = {
  ref?: Ref<SwipeCardHandle>;
  character: Character;
  /** is this the top (interactive) card? */
  active: boolean;
  /** stack index from top (0 = top) for depth styling */
  depth: number;
  /** profile compatibility %, shown as a hint on the card */
  compat?: number;
  /** per-dimension reasons behind the compatibility %, shown on tap */
  compatReasons?: CompatReason[];
  /** real distance in km (null when the user hasn't shared a location) */
  distanceKm?: number | null;
  /** gate a drag-committed swipe (e.g. out of daily likes); true = allowed */
  canSwipe?: (dir: SwipeDir) => boolean;
  /** called when a drag-committed swipe was blocked by canSwipe */
  onBlocked?: (dir: SwipeDir) => void;
  onSwipe: (dir: SwipeDir) => void;
};

const THRESHOLD = 120; // px to commit a horizontal swipe
const SUPERLIKE_THRESHOLD = -140; // upward drag

export default function SwipeCard({
  ref,
  character,
  active,
  depth,
  compat,
  compatReasons,
  distanceKm,
  canSwipe,
  onBlocked,
  onSwipe,
}: Props) {
  const locationLine =
    distanceKm != null
      ? `${character.location.split("·")[0].trim()} · ${distanceKm} km`
      : character.location;
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [exiting, setExiting] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const photos = useMemo(() => characterPhotos(character), [character]);
  const [photoIdx, setPhotoIdx] = useState(0);
  const prevPhoto = () => setPhotoIdx((i) => Math.max(0, i - 1));
  const nextPhoto = () => setPhotoIdx((i) => Math.min(photos.length - 1, i + 1));

  const rotate = useTransform(x, [-200, 200], [-18, 18]);
  const likeOpacity = useTransform(x, [20, THRESHOLD], [0, 1]);
  const nopeOpacity = useTransform(x, [-20, -THRESHOLD], [0, 1]);
  const superOpacity = useTransform(y, [-40, SUPERLIKE_THRESHOLD], [0, 1]);

  function fling(dir: SwipeDir) {
    setExiting(true);
    const toX = dir === "like" ? 600 : dir === "pass" ? -600 : 0;
    const toY = dir === "superlike" ? -800 : 0;
    animate(x, toX, { type: "spring", stiffness: 200, damping: 30 });
    animate(y, toY, { type: "spring", stiffness: 200, damping: 30 });
    setTimeout(() => onSwipe(dir), 220);
  }

  useImperativeHandle(ref, () => ({ fling }), [onSwipe]);

  function snapBack() {
    animate(x, 0, { type: "spring", stiffness: 300, damping: 25 });
    animate(y, 0, { type: "spring", stiffness: 300, damping: 25 });
  }

  // a drag past threshold commits a swipe — unless the economy gate blocks it,
  // in which case we snap back and let the parent surface the upsell.
  function commit(dir: SwipeDir) {
    if (canSwipe && !canSwipe(dir)) {
      snapBack();
      onBlocked?.(dir);
      return;
    }
    fling(dir);
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y < SUPERLIKE_THRESHOLD) return commit("superlike");
    if (info.offset.x > THRESHOLD) return commit("like");
    if (info.offset.x < -THRESHOLD) return commit("pass");
    snapBack();
  }

  const scale = 1 - depth * 0.05;
  const translateY = depth * 14;

  return (
    <motion.div
      className="no-select absolute inset-0 mx-auto"
      style={{
        x: active ? x : 0,
        y: active ? y : 0,
        rotate: active ? rotate : 0,
        zIndex: 100 - depth,
      }}
      drag={active && !exiting}
      dragElastic={0.6}
      onDragEnd={handleDragEnd}
      initial={{ scale: scale - 0.04, y: translateY + 20, opacity: 0 }}
      animate={{ scale, y: translateY, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
    >
      <div
        className="relative h-full w-full overflow-hidden rounded-[32px] shadow-2xl ring-1 ring-white/10"
        style={{
          background: `linear-gradient(180deg, ${character.accent}22, #0b0613)`,
        }}
      >
        {/* shimmer placeholder until the portrait decodes */}
        {!imgLoaded && (
          <div className="absolute inset-0 animate-pulse bg-white/5" />
        )}
        <img
          src={active ? photos[photoIdx] : character.photo}
          alt={character.name}
          draggable={false}
          loading={depth === 0 ? "eager" : "lazy"}
          onLoad={() => setImgLoaded(true)}
          className={`card-img h-full w-full object-cover ${imgLoaded ? "loaded" : ""}`}
          style={{ objectPosition: "center 25%" }}
        />

        {/* gallery tap zones (top card, multi-photo) */}
        {active && photos.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Önceki fotoğraf"
              onClick={prevPhoto}
              className="absolute inset-y-0 left-0 z-10 w-1/3"
            />
            <button
              type="button"
              aria-label="Sonraki fotoğraf"
              onClick={nextPhoto}
              className="absolute inset-y-0 right-0 z-10 w-1/3"
            />
          </>
        )}

        {/* progress bars (top card, multi-photo) */}
        {active && photos.length > 1 && (
          <div className="absolute inset-x-3 top-2 z-20 flex gap-1">
            {photos.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition ${
                  i === photoIdx ? "bg-white" : "bg-white/30"
                }`}
              />
            ))}
          </div>
        )}

        {/* readability gradient */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />

        {/* AI badge (regulatory: always disclose) */}
        <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 text-xs font-medium backdrop-blur-md ring-1 ring-white/20">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          ✨ AI Karakter
        </div>

        {/* compatibility hint (top-right) — tap to see why; top card only */}
        {active && typeof compat === "number" && compat >= 70 && (
          <div className="absolute right-4 top-4 z-20 flex flex-col items-end">
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setShowWhy((v) => !v)}
              className="flex items-center gap-1 rounded-full bg-pink-500/25 px-3 py-1 text-xs font-semibold text-pink-100 ring-1 ring-pink-300/40 backdrop-blur-md active:scale-95"
            >
              ✨ %{compat} uyum
              {compatReasons && compatReasons.length > 0 && (
                <span className="opacity-70">{showWhy ? "▲" : "▼"}</span>
              )}
            </button>
            <AnimatePresence>
              {showWhy && compatReasons && compatReasons.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="mt-2 w-56 space-y-1.5 rounded-2xl bg-black/70 p-3 text-xs ring-1 ring-white/15 backdrop-blur-xl"
                >
                  {compatReasons.map((r, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span>{r.good ? "✅" : "⚠️"}</span>
                      <span className={r.good ? "text-white/90" : "text-amber-200/90"}>
                        {r.label}
                      </span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* LIKE / NOPE / SUPER overlays (decorative — never block taps) */}
        {active && (
          <div className="pointer-events-none">
            <motion.div
              style={{ opacity: likeOpacity }}
              className="absolute right-6 top-10 -rotate-12 rounded-xl border-4 border-emerald-400 px-4 py-1 text-2xl font-black tracking-wider text-emerald-400"
            >
              BEĞEN
            </motion.div>
            <motion.div
              style={{ opacity: nopeOpacity }}
              className="absolute left-6 top-10 rotate-12 rounded-xl border-4 border-rose-500 px-4 py-1 text-2xl font-black tracking-wider text-rose-500"
            >
              GEÇ
            </motion.div>
            <motion.div
              style={{ opacity: superOpacity }}
              className="absolute left-1/2 top-16 -translate-x-1/2 rounded-xl border-4 border-sky-400 px-4 py-1 text-2xl font-black tracking-wider text-sky-400"
            >
              SÜPER ⭐
            </motion.div>
          </div>
        )}

        {/* info */}
        <div className="absolute inset-x-0 bottom-0 p-6">
          <div className="flex items-end gap-2">
            <h2 className="text-3xl font-bold drop-shadow">{character.name}</h2>
            <span className="pb-1 text-2xl font-light">{character.age}</span>
          </div>
          <p className="mt-0.5 text-sm text-white/70">{locationLine}</p>
          <p className="mt-2 text-sm leading-snug text-white/90">{character.bio}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {character.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-white/15 px-3 py-1 text-xs backdrop-blur-md"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
