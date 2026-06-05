import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useMatches } from "../store/useMatches";
import { useBlocks } from "../store/useBlocks";
import { generateReply } from "../lib/reply";
import { listenMessages, sendRealMessage, reportUser } from "../lib/db";
import { currentUserId } from "../lib/session";
import { isAICard } from "../types";

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
  const setMessages = useMatches((s) => s.setMessages);
  const removeMatch = useMatches((s) => s.removeMatch);
  const block = useBlocks((s) => s.block);

  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const matchId = conv?.matchId;
  const isReal = conv ? !isAICard(conv.character) : false;

  // real match → live-sync the shared thread from Firestore (both sides)
  useEffect(() => {
    if (!matchId) return;
    const me = currentUserId();
    return listenMessages(matchId, (rows) => {
      setMessages(characterId, rows.map((r) => ({
        id: r.id,
        role: r.from === me ? "user" : "character",
        text: r.text,
      })));
    });
  }, [matchId, characterId, setMessages]);

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

    // real user↔user: write to the shared thread; the listener reflects it
    if (matchId) {
      await sendRealMessage(matchId, text);
      return;
    }

    // AI character: optimistic user bubble + Gemini reply
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

  async function handleBlock() {
    setMenuOpen(false);
    await block(character.id);
    removeMatch(character.id);
    onBack();
  }

  async function handleReport() {
    setMenuOpen(false);
    await reportUser(character.id, "uygunsuz içerik/davranış");
    await block(character.id); // report implies block
    removeMatch(character.id);
    setToast("Şikayetin alındı, kullanıcı engellendi");
    setTimeout(onBack, 1300);
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
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">{character.name}</p>
          <p className="text-xs text-emerald-400">
            {isReal ? "çevrimiçi" : "✨ AI Karakter · çevrimiçi"}
          </p>
        </div>

        {/* safety menu — real matches only */}
        {isReal && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Seçenekler"
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-lg ring-1 ring-white/15 active:scale-90"
            >
              ⋯
            </button>
            <AnimatePresence>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    className="absolute right-0 top-11 z-20 w-44 overflow-hidden rounded-2xl bg-[#1c1230] ring-1 ring-white/15 backdrop-blur-xl"
                  >
                    <button
                      onClick={handleReport}
                      className="block w-full px-4 py-3 text-left text-sm text-amber-300 active:bg-white/10"
                    >
                      🚩 Şikayet et
                    </button>
                    <button
                      onClick={handleBlock}
                      className="block w-full border-t border-white/10 px-4 py-3 text-left text-sm text-rose-400 active:bg-white/10"
                    >
                      🚫 Engelle
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}
      </header>

      {/* messages */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto py-2"
      >
        {isReal && messages.length === 0 && (
          <div className="grid h-full place-items-center px-6 text-center text-sm text-white/50">
            <div>
              <p className="text-2xl">🎉</p>
              <p className="mt-2">
                {character.name} ile eşleştiniz! İlk mesajı sen at 👋
              </p>
            </div>
          </div>
        )}
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
      {!isReal && (
        <p className="pb-2 text-center text-[11px] text-white/30">
          Tüm yanıtlar yapay zekâdır.
        </p>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="pointer-events-none fixed bottom-24 left-1/2 z-[170] -translate-x-1/2 rounded-full bg-rose-500/90 px-5 py-2.5 text-sm font-semibold shadow-lg"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
