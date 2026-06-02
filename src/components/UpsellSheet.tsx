import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useEconomy } from "../store/useEconomy";

/** Why the sheet opened — drives the headline and which pack is highlighted. */
export type UpsellContext = "likes" | "superlike" | "boost" | "store";

type Props = { context: UpsellContext; onClose: () => void };

type Pack = {
  id: string;
  count: number;
  price: string;
  badge?: string;
  kind: "superlike" | "boost";
};

const SUPERLIKE_PACKS: Pack[] = [
  { id: "sl3", count: 3, price: "₺29", kind: "superlike" },
  { id: "sl5", count: 5, price: "₺49", badge: "Popüler", kind: "superlike" },
  { id: "sl15", count: 15, price: "₺119", badge: "En avantajlı", kind: "superlike" },
];

const BOOST_PACKS: Pack[] = [
  { id: "b1", count: 1, price: "₺39", kind: "boost" },
  { id: "b5", count: 5, price: "₺149", badge: "Popüler", kind: "boost" },
];

/** ms until the next local midnight, for the daily-quota reset countdown. */
function msToMidnight(): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}

function useCountdown(): string {
  const [ms, setMs] = useState(msToMidnight());
  useEffect(() => {
    const t = setInterval(() => setMs(msToMidnight()), 1000);
    return () => clearInterval(t);
  }, []);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${h}s ${m}d ${s}sn`;
}

const HEADLINES: Record<UpsellContext, { title: string; sub: string }> = {
  likes: {
    title: "Bugünlük beğenilerin bitti 💔",
    sub: "Yarın yeniden dolacak — ya da Premium ile sınırsıza geç.",
  },
  superlike: {
    title: "Süper Beğenin kalmadı ⭐",
    sub: "Süper Beğeni eşleşme şansını 3 kat artırır. Paket al, öne çık.",
  },
  boost: {
    title: "Boost ile öne çık 🚀",
    sub: "30 dakika boyunca profilin bölgendeki herkesin en üstünde.",
  },
  store: {
    title: "Amora Mağaza",
    sub: "Kredilerini doldur ya da Premium’a geç — daha çok eşleşme.",
  },
};

export default function UpsellSheet({ context, onClose }: Props) {
  const { superLikes, boosts, premium } = useEconomy();
  const addSuperLikes = useEconomy((s) => s.addSuperLikes);
  const addBoosts = useEconomy((s) => s.addBoosts);
  const setPremium = useEconomy((s) => s.setPremium);
  const countdown = useCountdown();
  const [toast, setToast] = useState<string | null>(null);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1600);
  }

  // demo purchase — no real payment (Stripe lands in P4)
  function buy(p: Pack) {
    if (p.kind === "superlike") {
      addSuperLikes(p.count);
      flash(`✓ ${p.count} Süper Beğeni eklendi`);
    } else {
      addBoosts(p.count);
      flash(`✓ ${p.count} Boost eklendi`);
    }
  }

  const head = HEADLINES[context];
  const focusBoost = context === "boost";

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[160] flex items-end justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          className="relative z-10 max-h-[90%] w-full max-w-md overflow-y-auto rounded-t-3xl bg-[#160d22] p-5 ring-1 ring-white/10"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />

          <h2 className="text-xl font-extrabold">{head.title}</h2>
          <p className="mt-1 text-sm text-white/65">{head.sub}</p>

          {context === "likes" && !premium && (
            <div className="mt-3 rounded-2xl bg-white/5 px-4 py-3 text-center ring-1 ring-white/10">
              <span className="text-xs uppercase tracking-wide text-white/50">
                Yeni beğeniler
              </span>
              <div className="mt-0.5 text-lg font-bold tabular-nums text-pink-200">
                {countdown}
              </div>
            </div>
          )}

          {/* current balance */}
          <div className="mt-4 flex gap-2 text-center text-sm">
            <div className="flex-1 rounded-xl bg-white/5 py-2 ring-1 ring-white/10">
              <div className="text-lg font-bold text-sky-300">{superLikes}</div>
              <div className="text-xs text-white/55">Süper Beğeni</div>
            </div>
            <div className="flex-1 rounded-xl bg-white/5 py-2 ring-1 ring-white/10">
              <div className="text-lg font-bold text-amber-300">{boosts}</div>
              <div className="text-xs text-white/55">Boost</div>
            </div>
            <div className="flex-1 rounded-xl bg-white/5 py-2 ring-1 ring-white/10">
              <div className="text-lg font-bold text-violet-300">{premium ? "∞" : "—"}</div>
              <div className="text-xs text-white/55">Premium</div>
            </div>
          </div>

          {/* Premium card */}
          <div className="mt-5 rounded-2xl bg-gradient-to-br from-pink-500/25 to-violet-500/25 p-4 ring-1 ring-pink-300/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-base font-bold">Amora Premium 👑</div>
                <div className="text-xs text-white/65">₺149/ay</div>
              </div>
              <button
                onClick={() => {
                  setPremium(!premium);
                  flash(premium ? "Premium kapatıldı" : "👑 Premium aktif!");
                }}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95 ${
                  premium
                    ? "bg-white/15 ring-1 ring-white/20"
                    : "bg-gradient-to-r from-pink-500 to-violet-500"
                }`}
              >
                {premium ? "Aktif ✓" : "Premium’a geç"}
              </button>
            </div>
            <ul className="mt-3 space-y-1 text-xs text-white/80">
              <li>♾️ Sınırsız beğeni</li>
              <li>⭐ Her ay 5 Süper Beğeni</li>
              <li>🎚️ Gelişmiş filtreler (değerler, yaşam tarzı)</li>
              <li>👀 Seni kim beğendi gör</li>
            </ul>
          </div>

          {/* plan comparison */}
          <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-white/10">
            <div className="grid grid-cols-[1fr_auto_auto] text-sm">
              <div className="bg-white/5 px-3 py-2 text-xs font-semibold text-white/50">
                Plan karşılaştırması
              </div>
              <div className="bg-white/5 px-3 py-2 text-center text-xs font-semibold text-white/60">
                Free
              </div>
              <div className="bg-white/5 px-3 py-2 text-center text-xs font-semibold text-pink-200">
                Premium
              </div>
              {COMPARISON.map((row) => (
                <Row key={row.label} label={row.label} free={row.free} premium={row.premium} />
              ))}
            </div>
          </div>

          {/* Süper Beğeni packs */}
          <h3 className="mb-2 mt-6 text-sm font-semibold text-white/80">
            ⭐ Süper Beğeni paketleri
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {SUPERLIKE_PACKS.map((p) => (
              <PackButton key={p.id} pack={p} onBuy={() => buy(p)} />
            ))}
          </div>

          {/* Boost packs */}
          <h3
            className={`mb-2 mt-6 text-sm font-semibold ${
              focusBoost ? "text-amber-200" : "text-white/80"
            }`}
          >
            🚀 Boost paketleri
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {BOOST_PACKS.map((p) => (
              <PackButton key={p.id} pack={p} onBuy={() => buy(p)} />
            ))}
          </div>

          <p className="mt-4 text-center text-[11px] text-white/35">
            Demo: gerçek ödeme alınmaz. Gerçek satın alma yakında.
          </p>

          <button
            onClick={onClose}
            className="mt-3 w-full rounded-full bg-white/10 px-6 py-3 font-semibold ring-1 ring-white/15 active:scale-[0.98]"
          >
            Kapat
          </button>
        </motion.div>

        {/* purchase confirmation toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="pointer-events-none fixed bottom-24 left-1/2 z-[170] -translate-x-1/2 rounded-full bg-emerald-500/90 px-5 py-2.5 text-sm font-semibold shadow-lg"
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}

const COMPARISON: { label: string; free: string; premium: string }[] = [
  { label: "Günlük beğeni", free: "30", premium: "∞" },
  { label: "Süper Beğeni", free: "Satın al", premium: "Aylık 5" },
  { label: "Gelişmiş filtreler", free: "—", premium: "✓" },
  { label: "Seni kim beğendi", free: "—", premium: "✓" },
  { label: "Boost", free: "Satın al", premium: "Dahil" },
];

function Row({ label, free, premium }: { label: string; free: string; premium: string }) {
  return (
    <>
      <div className="border-t border-white/5 px-3 py-2 text-white/75">{label}</div>
      <div className="border-t border-white/5 px-3 py-2 text-center text-white/50">{free}</div>
      <div className="border-t border-white/5 px-3 py-2 text-center font-semibold text-pink-200">
        {premium}
      </div>
    </>
  );
}

function PackButton({ pack, onBuy }: { pack: Pack; onBuy: () => void }) {
  return (
    <button
      onClick={onBuy}
      className="relative rounded-2xl bg-white/5 px-2 py-3 text-center ring-1 ring-white/10 transition active:scale-95 hover:bg-white/10"
    >
      {pack.badge && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-2 py-0.5 text-[10px] font-bold">
          {pack.badge}
        </span>
      )}
      <div className="text-lg font-extrabold">{pack.count}×</div>
      <div className="mt-0.5 text-sm font-semibold text-pink-200">{pack.price}</div>
    </button>
  );
}
