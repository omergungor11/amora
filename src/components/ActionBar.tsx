import { motion } from "motion/react";
import type { SwipeDir } from "../types";

type Props = {
  onAction: (dir: SwipeDir) => void;
  disabled?: boolean;
  /** likes remaining today; Infinity for Premium. Shown under the ♥ button. */
  likesLeft?: number;
  /** Süper Beğeni credits; shown as a badge on the ⭐ button. */
  superCount?: number;
};

const buttons: {
  dir: SwipeDir;
  label: string;
  ring: string;
  text: string;
  size: string;
  glow: string;
}[] = [
  { dir: "pass", label: "✕", ring: "ring-rose-500/60", text: "text-rose-400", size: "h-14 w-14 text-2xl", glow: "rgba(244,63,94,0.5)" },
  { dir: "superlike", label: "⭐", ring: "ring-sky-400/60", text: "text-sky-300", size: "h-12 w-12 text-xl", glow: "rgba(56,189,248,0.55)" },
  { dir: "like", label: "♥", ring: "ring-emerald-400/60", text: "text-emerald-300", size: "h-14 w-14 text-2xl", glow: "rgba(52,211,153,0.5)" },
];

export default function ActionBar({ onAction, disabled, likesLeft, superCount }: Props) {
  return (
    <div className="flex items-center justify-center gap-5">
      {buttons.map((b) => (
        <div key={b.dir} className="relative flex flex-col items-center gap-1">
          <motion.button
            whileTap={{ scale: 0.82 }}
            whileHover={{ scale: 1.1, boxShadow: `0 0 22px ${b.glow}` }}
            disabled={disabled}
            onClick={() => onAction(b.dir)}
            className={`grid place-items-center rounded-full bg-white/10 ring-2 backdrop-blur-md transition-shadow disabled:opacity-40 ${b.ring} ${b.text} ${b.size}`}
          >
            {b.label}
          </motion.button>

          {/* Süper Beğeni credit badge */}
          {b.dir === "superlike" && typeof superCount === "number" && (
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-sky-500 px-1 text-[11px] font-bold ring-2 ring-[#0b0613]">
              {superCount}
            </span>
          )}

          {/* daily likes remaining */}
          {b.dir === "like" && typeof likesLeft === "number" && (
            <span className="text-[11px] font-medium tabular-nums text-white/45">
              {likesLeft === Infinity ? "∞" : likesLeft}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
