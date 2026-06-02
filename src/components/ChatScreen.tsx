import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useMatches } from "../store/useMatches";
import { generateReply } from "../lib/reply";

type Props = { characterId: string; onBack: () => void };

function TypingDots() {
  return (
    <div className="flex gap-1 px-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-white/70"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

export default function ChatScreen({ characterId, onBack }: Props) {
  const conv = useMatches((s) => s.conversations[characterId]);
  const appendUser = useMatches((s) => s.appendUser);
  const startReply = useMatches((s) => s.startCharacterReply);
  const finishReply = useMatches((s) => s.finishCharacterReply);

  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [conv?.messages.length, busy]);

  if (!conv) return null;
  const { character, messages } = conv;

  async function send() {
    const text = draft.trim();
    if (!text || busy) return;
    setDraft("");
    setBusy(true);
    appendUser(character.id, text);
    const history = [
      ...messages,
      { id: "tmp", role: "user" as const, text },
    ];
    const msgId = startReply(character.id);
    try {
      const reply = await generateReply(character, history);
      finishReply(character.id, msgId, reply);
    } catch {
      finishReply(character.id, msgId, "Pardon, bir şeyler ters gitti 😅");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-md flex-col px-2">
      {/* header */}
      <header className="flex items-center gap-3 py-3">
        <button
          onClick={onBack}
          className="grid h-9 w-9 place-items-center rounded-full bg-white/10 ring-1 ring-white/15 active:scale-90"
          aria-label="Geri"
        >
          ‹
        </button>
        <img
          src={character.photo}
          alt={character.name}
          className="h-10 w-10 rounded-full object-cover ring-2 ring-pink-400/50"
        />
        <div className="min-w-0">
          <p className="truncate font-semibold leading-tight">{character.name}</p>
          <p className="text-xs text-emerald-400">✨ AI Karakter · çevrimiçi</p>
        </div>
      </header>

      {/* messages */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto py-2"
      >
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              layout
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-snug ${
                  m.role === "user"
                    ? "rounded-br-md bg-gradient-to-br from-pink-500 to-violet-500 text-white"
                    : "rounded-bl-md bg-white/10 text-white/90 ring-1 ring-white/10 backdrop-blur-md"
                }`}
              >
                {m.pending ? <TypingDots /> : m.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* input */}
      <div className="flex items-center gap-2 py-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={`${character.name}'e yaz...`}
          className="flex-1 rounded-full bg-white/10 px-4 py-3 text-sm outline-none ring-1 ring-white/15 placeholder:text-white/30 focus:ring-pink-400/60"
        />
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={send}
          disabled={!draft.trim() || busy}
          className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-pink-500 to-violet-500 text-lg shadow-lg disabled:opacity-40"
          aria-label="Gönder"
        >
          ➤
        </motion.button>
      </div>
      <p className="pb-2 text-center text-[11px] text-white/30">
        Tüm yanıtlar yapay zekâdır.
      </p>
    </div>
  );
}
