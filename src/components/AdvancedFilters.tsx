import { motion } from "motion/react";
import { useProfile } from "../store/useProfile";
import { useEconomy } from "../store/useEconomy";
import type { FilterKey, UserProfile } from "../types";
import type { Option } from "../data/profileOptions";
import {
  SMOKING, DRINKING, EXERCISE, DIET, POLITICS, RELIGION, KIDS, INTERESTS,
} from "../data/profileOptions";

/** Multi-select chip row over an Option set, backed by profile.filters[key]. */
function FilterChips({
  options,
  values,
  onToggle,
}: {
  options: Option[];
  values: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = values.includes(o.value);
        return (
          <motion.button
            key={o.value}
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => onToggle(o.value)}
            className={`rounded-full px-3 py-1.5 text-sm ring-1 transition ${
              active
                ? "bg-pink-500/30 text-white ring-pink-400/70"
                : "bg-white/5 text-white/70 ring-white/10"
            }`}
          >
            {o.emoji ? `${o.emoji} ` : ""}
            {o.label}
          </motion.button>
        );
      })}
    </div>
  );
}

const SECTIONS: { key: FilterKey; label: string; options: Option[] }[] = [
  { key: "smoking", label: "Sigara", options: SMOKING },
  { key: "drinking", label: "Alkol", options: DRINKING },
  { key: "exercise", label: "Spor", options: EXERCISE },
  { key: "diet", label: "Beslenme", options: DIET },
  { key: "politics", label: "Politika", options: POLITICS },
  { key: "religion", label: "Dünya görüşü", options: RELIGION },
  { key: "kids", label: "Çocuk", options: KIDS },
];

const INTEREST_OPTIONS: Option[] = INTERESTS.map((i) => ({ value: i, label: i }));

export default function AdvancedFilters({ onUpsell }: { onUpsell: () => void }) {
  const profile = useProfile((s) => s.profile);
  const update = useProfile((s) => s.update);
  const premium = useEconomy((s) => s.premium);
  if (!profile) return null;

  const filters = profile.filters ?? {};

  function toggle(key: FilterKey, value: string) {
    const cur = (filters as UserProfile["filters"])![key] ?? [];
    const next = cur.includes(value)
      ? cur.filter((v) => v !== value)
      : [...cur, value];
    update({ filters: { ...filters, [key]: next } });
  }

  function clearAll() {
    update({ filters: {} });
  }

  return (
    <div className="relative">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-white/80">
          🎚️ Gelişmiş Filtreler
          <span className="rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-1.5 py-0.5 text-[10px] font-bold">
            Premium
          </span>
        </h3>
        {premium && (
          <button onClick={clearAll} className="text-xs text-white/40 active:scale-95">
            Temizle
          </button>
        )}
      </div>

      <div className={premium ? "" : "pointer-events-none select-none blur-[3px]"}>
        <div className="space-y-4">
          {SECTIONS.map((s) => (
            <div key={s.key}>
              <label className="mb-1.5 block text-xs text-white/50">{s.label}</label>
              <FilterChips
                options={s.options}
                values={filters[s.key] ?? []}
                onToggle={(v) => toggle(s.key, v)}
              />
            </div>
          ))}
          <div>
            <label className="mb-1.5 block text-xs text-white/50">İlgi alanları</label>
            <FilterChips
              options={INTEREST_OPTIONS}
              values={filters.interests ?? []}
              onToggle={(v) => toggle("interests", v)}
            />
          </div>
        </div>
      </div>

      {/* lock overlay for free users */}
      {!premium && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-[#160d22]/40">
          <div className="text-center">
            <div className="text-2xl">🔒</div>
            <p className="mt-1 max-w-[15rem] text-sm text-white/80">
              Değerlere, yaşam tarzına ve ilgi alanlarına göre filtrele
            </p>
          </div>
          <button
            onClick={onUpsell}
            className="rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-5 py-2.5 text-sm font-semibold active:scale-95"
          >
            Premium ile aç 👑
          </button>
        </div>
      )}
    </div>
  );
}
