import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useProfile } from "../store/useProfile";
import { useEconomy } from "../store/useEconomy";
import { useMatches } from "../store/useMatches";
import { useBlocks } from "../store/useBlocks";
import { compatPercent } from "../lib/compatibility";
import { characterPhotos } from "../data/themePhotos";
import { loadLikedBy, sendLike } from "../lib/db";
import { profileToCard } from "../lib/deck";
import { useAuth } from "../lib/useAuth";
import type { Character } from "../types";

type Props = {
  onClose: () => void;
  onUpsell: () => void;
  onOpenChat: (characterId: string) => void;
};

const MAX_LIKERS = 12;

/**
 * "Seni Beğenenler" — the real see-who-liked-you list (a Premium perk). Pulls
 * the actual users who liked me (`loadLikedBy`), excluding ones already matched.
 * Free users see a blurred teaser + count; Premium users see real cards and
 * tapping one is an instant mutual match (they already liked me) → chat.
 */
export default function LikedYouSheet({ onClose, onUpsell, onOpenChat }: Props) {
  const profile = useProfile((s) => s.profile);
  const premium = useEconomy((s) => s.premium);
  const addRealMatch = useMatches((s) => s.addRealMatch);
  const hasMatch = useMatches((s) => s.hasMatch);
  const isBlocked = useBlocks((s) => s.isBlocked);
  const authUid = useAuth().user?.uid;
  const [likers, setLikers] = useState<{ c: Character; sup: boolean }[]>([]);

  useEffect(() => {
    if (!authUid) return;
    loadLikedBy()
      .then((rows) =>
        setLikers(
          rows
            .map((r) => ({ c: profileToCard(r.profile), sup: r.kind === "superlike" }))
            .filter(({ c }) => !hasMatch(c.id) && !isBlocked(c.id))
            // super-likers first, so the paid signal stands out
            .sort((a, b) => Number(b.sup) - Number(a.sup))
            .slice(0, MAX_LIKERS),
        ),
      )
      .catch(() => setLikers([]));
    // hasMatch is read once at load; not a reactive dependency here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUid]);

  function likeBack(c: Character) {
    // they already liked me → liking back is an instant mutual match
    sendLike(c.id, "like").then((matchId) => {
      if (matchId) addRealMatch(c, matchId);
      onClose();
      if (matchId) onOpenChat(c.id);
    });
    setLikers((cur) => cur.filter((x) => x.c.id !== c.id));
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
              {likers.map(({ c, sup }) => (
                <button
                  key={c.id}
                  onClick={() => (premium ? likeBack(c) : onUpsell())}
                  className={`relative aspect-[3/4] overflow-hidden rounded-2xl ring-1 active:scale-95 ${
                    sup ? "ring-sky-400/70" : "ring-white/10"
                  }`}
                >
                  <img
                    src={characterPhotos(c)[0]}
                    alt={premium ? c.name : "Gizli"}
                    className={`h-full w-full object-cover ${premium ? "" : "blur-xl scale-110"}`}
                    style={{ objectPosition: "center 25%" }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  {sup && (
                    <div className="absolute left-2 top-2 rounded-full bg-sky-500/40 px-2 py-0.5 text-[11px] font-bold text-sky-100 ring-1 ring-sky-300/50 backdrop-blur-md">
                      ⭐ Süper
                    </div>
                  )}
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
