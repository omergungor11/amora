import { motion } from "motion/react";
import { useMatches } from "../store/useMatches";

type Props = { onOpen: (characterId: string) => void };

export default function Inbox({ onOpen }: Props) {
  const order = useMatches((s) => s.order);
  const conversations = useMatches((s) => s.conversations);

  return (
    <div className="mx-auto flex h-full max-w-md flex-col px-2">
      <header className="py-3">
        <h1 className="text-2xl font-bold">Eşleşmeler</h1>
      </header>

      {order.length === 0 ? (
        <div className="grid flex-1 place-items-center text-center text-white/60">
          <div>
            <p className="text-lg">Henüz eşleşmen yok 💫</p>
            <p className="mt-1 text-sm">Kaydırmaya başla, biri seni beğensin!</p>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto py-1">
          {order.map((id) => {
            const conv = conversations[id];
            const last = conv.messages[conv.messages.length - 1];
            return (
              <motion.button
                key={id}
                layout
                whileTap={{ scale: 0.98 }}
                onClick={() => onOpen(id)}
                className="flex w-full items-center gap-3 rounded-2xl bg-white/5 p-3 text-left ring-1 ring-white/10 active:bg-white/10"
              >
                <img
                  src={conv.character.photo}
                  alt={conv.character.name}
                  className="h-14 w-14 rounded-full object-cover ring-2 ring-pink-400/40"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{conv.character.name}</p>
                  <p className="truncate text-sm text-white/60">
                    {last?.pending
                      ? "yazıyor…"
                      : (last?.text ?? "Eşleştiniz! İlk mesajı sen at 👋")}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
