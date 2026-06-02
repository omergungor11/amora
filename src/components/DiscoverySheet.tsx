import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useProfile } from "../store/useProfile";
import { requestLocation, setCity, CITIES } from "../lib/location";
import { ChipGroup, Field } from "./profile/Fields";
import AdvancedFilters from "./AdvancedFilters";
import UpsellSheet from "./UpsellSheet";
import { RELATIONSHIP } from "../data/profileOptions";
import type { InterestedIn } from "../types";

const GENDERS: { value: InterestedIn; label: string }[] = [
  { value: "women", label: "Kadınlar" },
  { value: "men", label: "Erkekler" },
  { value: "everyone", label: "Herkes" },
];

export default function DiscoverySheet({ onClose }: { onClose: () => void }) {
  const profile = useProfile((s) => s.profile);
  const update = useProfile((s) => s.update);
  const [locating, setLocating] = useState(false);
  const [showPremium, setShowPremium] = useState(false);

  if (!profile) return null;
  const distance = profile.distanceKm ?? 100;
  const ageMin = profile.ageMin ?? 18;
  const ageMax = profile.ageMax ?? 60;
  const hasLocation = profile.lat != null && profile.lng != null;

  async function useMyLocation() {
    setLocating(true);
    const ok = await requestLocation();
    setLocating(false);
    if (!ok) alert("Konum alınamadı. Aşağıdan bir şehir seçebilirsin.");
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[150] flex items-end justify-center"
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
          <h2 className="mb-4 text-lg font-bold">Keşif Ayarları</h2>

          <div className="space-y-5">
            {/* location */}
            <Field label="Konum">
              <div className="flex items-center gap-2">
                <button
                  onClick={useMyLocation}
                  disabled={locating}
                  className="flex-1 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
                >
                  {locating ? "Alınıyor…" : "📍 Konumumu kullan"}
                </button>
                {hasLocation && (
                  <span className="text-xs text-emerald-300">
                    ✓ {profile.locationLabel ?? "ayarlandı"}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {CITIES.map((c) => (
                  <button
                    key={c.label}
                    onClick={() => setCity(c.label)}
                    className={`rounded-full px-3 py-1 text-xs ring-1 transition ${
                      profile.locationLabel === c.label
                        ? "bg-pink-500/30 ring-pink-400/70"
                        : "bg-white/5 ring-white/10 text-white/70"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </Field>

            {/* distance */}
            <Field label={`Mesafe: ${distance} km${hasLocation ? "" : " (konum gerekli)"}`}>
              <input
                type="range"
                min={5}
                max={200}
                step={5}
                value={distance}
                onChange={(e) => update({ distanceKm: Number(e.target.value) })}
                className="w-full accent-pink-500"
              />
            </Field>

            {/* age range */}
            <Field label={`Yaş aralığı: ${ageMin} – ${ageMax}`}>
              <div className="space-y-2">
                <input
                  type="range"
                  min={18}
                  max={80}
                  value={ageMin}
                  onChange={(e) => update({ ageMin: Math.min(Number(e.target.value), ageMax) })}
                  className="w-full accent-pink-500"
                />
                <input
                  type="range"
                  min={18}
                  max={80}
                  value={ageMax}
                  onChange={(e) => update({ ageMax: Math.max(Number(e.target.value), ageMin) })}
                  className="w-full accent-pink-500"
                />
              </div>
            </Field>

            {/* gender */}
            <Field label="Kimi göster">
              <div className="grid grid-cols-3 gap-2">
                {GENDERS.map((g) => (
                  <button
                    key={g.value}
                    onClick={() => update({ interestedIn: g.value })}
                    className={`rounded-xl px-3 py-2.5 text-sm ring-1 transition ${
                      profile.interestedIn === g.value
                        ? "bg-pink-500/30 ring-pink-400/70"
                        : "bg-white/5 ring-white/10"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </Field>

            {/* looking for */}
            <Field label="Ne arıyorsun?">
              <ChipGroup
                options={RELATIONSHIP}
                value={profile.relationship}
                onChange={(v) => update({ relationship: v })}
              />
            </Field>

            {/* advanced filters (Premium) */}
            <div className="border-t border-white/10 pt-5">
              <AdvancedFilters onUpsell={() => setShowPremium(true)} />
            </div>
          </div>

          <button
            onClick={onClose}
            className="mt-6 w-full rounded-full bg-white/10 px-6 py-3 font-semibold ring-1 ring-white/15 active:scale-[0.98]"
          >
            Uygula
          </button>
        </motion.div>
      </motion.div>

      {showPremium && (
        <UpsellSheet context="store" onClose={() => setShowPremium(false)} />
      )}
    </AnimatePresence>
  );
}
