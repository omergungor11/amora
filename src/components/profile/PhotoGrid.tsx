import { useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { downscaleImage } from "../../lib/image";

/**
 * Editable grid of 1–`max` profile photos. photos[0] is the primary one.
 * Uploads are downscaled before they ever hit state/Firestore.
 */
export function PhotoGrid({
  photos,
  onChange,
  max = 4,
}: {
  photos: string[];
  onChange: (photos: string[]) => void;
  max?: number;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function add(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setBusy(true);
    const next = [...photos];
    for (const f of files) {
      if (next.length >= max) break;
      try {
        next.push(await downscaleImage(f));
      } catch {
        /* skip unreadable file */
      }
    }
    setBusy(false);
    onChange(next.slice(0, max));
  }

  const remove = (i: number) => onChange(photos.filter((_, j) => j !== i));
  const makePrimary = (i: number) => {
    const next = [...photos];
    const [pick] = next.splice(i, 1);
    onChange([pick, ...next]);
  };

  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        <AnimatePresence initial={false}>
          {photos.map((src, i) => (
            <motion.div
              key={src.slice(-32) + i}
              layout
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              className="relative aspect-[3/4] overflow-hidden rounded-xl ring-1 ring-white/15"
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
              {i === 0 ? (
                <span className="absolute left-1 top-1 rounded-full bg-pink-500/80 px-1.5 py-0.5 text-[9px] font-semibold">
                  ⭐ ana
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => makePrimary(i)}
                  className="absolute left-1 top-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[9px] backdrop-blur-sm active:scale-95"
                >
                  ana yap
                </button>
              )}
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Fotoğrafı kaldır"
                className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-xs active:scale-90"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {photos.length < max && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="grid aspect-[3/4] place-items-center rounded-xl bg-white/5 text-2xl text-white/50 ring-1 ring-dashed ring-white/20 active:scale-95 disabled:opacity-50"
          >
            {busy ? "…" : "＋"}
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        onChange={add}
        className="hidden"
      />
    </div>
  );
}
