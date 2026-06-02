import { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { characters } from "../data/characters";
import { useProfile } from "../store/useProfile";
import { useEconomy } from "../store/useEconomy";
import { useTaste } from "../store/useTaste";
import { useMatches } from "../store/useMatches";
import { compatPercent } from "../lib/compatibility";
import { characterPhotos } from "../data/themePhotos";
import { generateOpener } from "../lib/reply";
import type { Character } from "../types";

type Props = {
  onClose: () => void;
  onUpsell: () => void;
  onOpenChat: (characterId: string) => void;
};

const MAX_LIKERS = 8;

/**
 * "Seni Beğenenler" — the see-who-liked-you list (a Premium perk). Likers are
 * simulated from the highest-compatibility unseen characters. Free users see a
 * blurred teaser + count; Premium users see real cards and tapping one is an
 * instant mutual match that jumps straight into chat.
 */
export default function LikedYouSheet({ onClose, onUpsell, onOpenChat }: Props) {
  const profile = useProfile((s) => s.profile);
  const premium = useEconomy((s) => s.premium);
  const seen = useTaste((s) => s.seen);
  const record = useTaste((s) => s.record);
  const addMatch = useMatches((s) => s.addMatch);
  const resolveOpener = useMatches((s) => s.resolveOpener);
  const hasMatch = useMatches((s) => s.hasMatch);

  const likers = useMemo(() => {
    if (!profile) return [];
    const want =
      profile.interestedIn === "everyone"
        ? null
        : profile.interestedIn === "women"
          ? "woman"
          : "man";
    return characters
      .filter((c) => (want ? c.gender === want : true))
      .filter((c) => !seen.includes(c.id) && !hasMatch(c.id))
      .map((c) => ({ c, score: compatPercent(profile, c) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_LIKERS)
      .map((x) => x.c);
  }, [profile, seen, hasMatch]);

  function likeBack(c: Character) {
    record(c, "like"); // adds to seen + taste + persists
    addMatch(c);
    generateOpener(c).then((text) => resolveOpener(c.id, text));
    onClose();
    onOpenChat(c.id);
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[155] flex items-end justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          className="relative z-10 max-h-[88%] w-full max-w-md overflow-y-auto rounded-t-3xl bg-[#160d22] p-5 ring-1 ring-white/10"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
          <h2 className="text-lg font-bold">
            💜 Seni Beğenenler{" "}
            <span className="text-pink-300">{likers.length}</span>
          </h2>
          <p className="mt-1 text-sm text-white/60">
            {premium
              ? "Sana bayılan karakterler. Birine dokun, anında eşleşin."
              : "Seni beğenenleri görmek ve anında eşleşmek Premium’a özel."}
          </p>

          {likers.length === 0 ? (
            <p className="py-10 text-center text-white/50">
              Şimdilik yeni beğeni yok — kaydırmaya devam et 👀
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {likers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => (premium ? likeBack(c) : onUpsell())}
                  className="relative aspect-[3/4] overflow-hidden rounded-2xl ring-1 ring-white/10 active:scale-95"
                >
                  <img
                    src={characterPhotos(c)[0]}
                    alt={premium ? c.name : "Gizli"}
                    className={`h-full w-full object-cover ${premium ? "" : "blur-xl scale-110"}`}
                    style={{ objectPosition: "center 25%" }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute right-2 top-2 rounded-full bg-pink-500/30 px-2 py-0.5 text-[11px] font-semibold text-pink-100 ring-1 ring-pink-300/40 backdrop-blur-md">
                    %{compatPercent(profile!, c)}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-2.5 text-left">
                    {premium ? (
                      <>
                        <div className="text-sm font-bold">
                          {c.name}, {c.age}
                        </div>
                        <div className="text-xs text-pink-200">Beğenmek için dokun 💕</div>
                      </>
                    ) : (
                      <div className="flex items-center gap-1 text-sm font-semibold">
                        🔒 Gizli
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {!premium && likers.length > 0 && (
            <button
              onClick={onUpsell}
              className="mt-5 w-full rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-6 py-3 font-semibold active:scale-[0.98]"
            >
              {likers.length} kişiyi gör — Premium 👑
            </button>
          )}

          <button
            onClick={onClose}
            className="mt-3 w-full rounded-full bg-white/10 px-6 py-3 font-semibold ring-1 ring-white/15 active:scale-[0.98]"
          >
            Kapat
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
