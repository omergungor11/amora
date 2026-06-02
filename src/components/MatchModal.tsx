import { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { Character } from "../types";

type Props = {
  character: Character | null;
  onClose: () => void;
  onChat: () => void;
};

const EMOJIS = ["💖", "✨", "💘", "💕", "⭐", "🌟", "💞"];

/** A radial burst of hearts/sparkles flung outward from the center. */
function Confetti() {
  const bits = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => {
        const angle = (i / 22) * Math.PI * 2 + Math.random() * 0.4;
        const dist = 120 + Math.random() * 160;
        return {
          id: i,
          emoji: EMOJIS[i % EMOJIS.length],
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          rot: (Math.random() - 0.5) * 240,
          delay: Math.random() * 0.12,
          size: 14 + Math.random() * 18,
        };
      }),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      {bits.map((b) => (
        <motion.span
          key={b.id}
          className="absolute"
          style={{ fontSize: b.size }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.2, rotate: 0 }}
          animate={{
            x: b.x,
            y: b.y,
            opacity: [0, 1, 1, 0],
            scale: [0.2, 1.1, 1, 0.8],
            rotate: b.rot,
          }}
          transition={{ duration: 1.5, delay: b.delay, ease: "easeOut" }}
        >
          {b.emoji}
        </motion.span>
      ))}
    </div>
  );
}

export default function MatchModal({ character, onClose, onChat }: Props) {
  return (
    <AnimatePresence>
      {character && (
        <motion.div
          className="fixed inset-0 z-[200] grid place-items-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />

          {/* colored bloom behind the card */}
          <motion.div
            className="pointer-events-none absolute h-80 w-80 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(236,72,153,0.55), transparent 70%)",
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.4, 1.1], opacity: [0, 0.9, 0.6] }}
            transition={{ duration: 0.8 }}
          />

          <Confetti />

          <motion.div
            className="relative z-10 w-full max-w-sm text-center"
            initial={{ scale: 0.8, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
          >
            <motion.h1
              className="bg-gradient-to-r from-pink-400 via-fuchsia-400 to-violet-400 bg-clip-text text-5xl font-black text-transparent"
              initial={{ scale: 0.5 }}
              animate={{ scale: [0.5, 1.15, 1] }}
              transition={{ duration: 0.6 }}
            >
              Eşleştiniz! 💘
            </motion.h1>
            <p className="mt-2 text-white/80">
              {character.name} seninle tanışmak istiyor
            </p>

            <div className="relative mx-auto mt-6 h-40 w-40">
              {/* pulsing glow ring */}
              <motion.div
                className="absolute inset-0 rounded-full ring-2 ring-pink-400/60"
                animate={{ scale: [1, 1.18, 1], opacity: [0.7, 0, 0.7] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
              />
              <motion.img
                src={character.photo}
                alt={character.name}
                className="h-40 w-40 rounded-full object-cover ring-4 ring-pink-400/70"
                style={{ objectPosition: "center 25%" }}
                initial={{ rotate: -8, scale: 0.85 }}
                animate={{ rotate: [-8, 8, 0], scale: 1 }}
                transition={{ duration: 0.7 }}
              />
            </div>

            <div className="mt-8 flex flex-col gap-3">
              <motion.button
                whileTap={{ scale: 0.96 }}
                whileHover={{ scale: 1.02 }}
                onClick={onChat}
                className="rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-6 py-3 font-semibold shadow-lg shadow-pink-500/30"
              >
                Mesaj Gönder
              </motion.button>
              <button
                onClick={onClose}
                className="rounded-full bg-white/10 px-6 py-3 font-medium text-white/80 active:scale-95"
              >
                Kaydırmaya Devam
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
