import { useState } from "react";
import { motion } from "motion/react";
import { useProfile } from "../store/useProfile";
import { ageFromDate, zodiac } from "../lib/astro";
import { PhotoGrid } from "../components/profile/PhotoGrid";
import type { InterestedIn } from "../types";

const options: { value: InterestedIn; label: string }[] = [
  { value: "women", label: "Kadınlar" },
  { value: "men", label: "Erkekler" },
  { value: "everyone", label: "Herkes" },
];

export default function Onboarding() {
  const create = useProfile((s) => s.create);
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [interestedIn, setInterestedIn] = useState<InterestedIn>("women");

  const age = ageFromDate(birthDate);
  const sign = zodiac(birthDate);
  const tooYoung = age !== null && age < 18;
  const canContinue =
    name.trim().length > 0 && photos.length > 0 && age !== null && !tooYoung;

  function start() {
    if (!canContinue) return;
    create({ name: name.trim(), birthDate, photos, interestedIn });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex h-full max-w-md flex-col justify-center overflow-y-auto px-2 py-6"
    >
      <div className="flex items-center gap-3">
        <motion.div
          className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-pink-500 to-violet-500 text-2xl shadow-lg shadow-pink-500/40"
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 16 }}
        >
          <motion.span
            animate={{ scale: [1, 1.18, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          >
            💘
          </motion.span>
        </motion.div>
        <h1 className="bg-gradient-to-r from-pink-400 to-violet-400 bg-clip-text text-5xl font-black tracking-tight text-transparent">
          Amora
        </h1>
      </div>
      <p className="mt-3 text-white/70">
        Önce seni tanıyalım. Sadece birkaç temel bilgi — gerisini sonra
        profilinde detaylandırırsın.
      </p>

      {/* photos (at least one required) */}
      <div className="mt-7">
        <label className="mb-1.5 block text-sm text-white/60">
          Fotoğrafların * <span className="text-white/40">(en az 1, en fazla 4)</span>
        </label>
        <PhotoGrid photos={photos} onChange={setPhotos} max={4} />
      </div>

      <label htmlFor="name" className="mt-4 block text-sm text-white/60">
        Adın *
      </label>
      <input
        id="name"
        name="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Örn. Ömer"
        className="mt-1 w-full rounded-2xl bg-white/10 px-4 py-3 outline-none ring-1 ring-white/15 placeholder:text-white/30 focus:ring-pink-400/60"
      />

      <label htmlFor="bd" className="mt-5 block text-sm text-white/60">
        Doğum tarihin *
      </label>
      <input
        id="bd"
        name="birthDate"
        type="date"
        value={birthDate}
        max="2010-12-31"
        onChange={(e) => setBirthDate(e.target.value)}
        className="mt-1 w-full rounded-2xl bg-white/10 px-4 py-3 text-white outline-none ring-1 ring-white/15 focus:ring-pink-400/60 [color-scheme:dark]"
      />
      {age !== null && (
        <p className="mt-1.5 text-xs text-white/50">
          {tooYoung ? (
            <span className="text-rose-400">Amora 18 yaş ve üzeri içindir.</span>
          ) : (
            <>
              {age} yaşındasın{sign ? ` · ${sign.emoji} ${sign.name}` : ""}
            </>
          )}
        </p>
      )}

      <label className="mt-5 block text-sm text-white/60">İlgilendiğin</label>
      <div className="mt-1 grid grid-cols-3 gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => setInterestedIn(o.value)}
            className={`rounded-2xl px-3 py-3 text-sm ring-1 transition ${
              interestedIn === o.value
                ? "bg-pink-500/30 ring-pink-400/70"
                : "bg-white/5 ring-white/10"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        disabled={!canContinue}
        onClick={start}
        className="mt-8 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-6 py-3.5 font-semibold shadow-lg disabled:opacity-40"
      >
        Başla
      </motion.button>

      <p className="mt-4 text-center text-xs text-white/40">
        * zorunlu alanlar · Tüm profiller yapay zekâdır. 18 yaş ve üzeri içindir.
      </p>
    </motion.div>
  );
}
