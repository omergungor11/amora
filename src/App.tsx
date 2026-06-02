import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Onboarding from "./screens/Onboarding";
import SwipeScreen from "./screens/SwipeScreen";
import Profile from "./screens/Profile";
import Inbox from "./components/Inbox";
import ChatScreen from "./components/ChatScreen";
import { useMatches } from "./store/useMatches";
import { useProfile } from "./store/useProfile";

type Tab = "swipe" | "inbox" | "profile";

export default function App() {
  const profile = useProfile((s) => s.profile);
  const [tab, setTab] = useState<Tab>("swipe");
  const [chatId, setChatId] = useState<string | null>(null);
  const matchCount = useMatches((s) => s.order.length);

  return (
    <div className="relative h-full">
      <div className="aurora" />
      <div className="aurora-extra" />
      <div className="app-grain" />
      <main className="relative z-10 mx-auto flex h-full max-w-lg flex-col px-4 py-2">
        <AnimatePresence mode="wait">
          {!profile ? (
            <Onboarding key="onboarding" />
          ) : chatId ? (
            <motion.div
              key={`chat-${chatId}`}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              className="min-h-0 flex-1"
            >
              <ChatScreen characterId={chatId} onBack={() => setChatId(null)} />
            </motion.div>
          ) : (
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="min-h-0 flex-1"
            >
              {tab === "swipe" ? (
                <SwipeScreen
                  name={profile.name}
                  interestedIn={profile.interestedIn}
                  onOpenChat={setChatId}
                />
              ) : tab === "inbox" ? (
                <Inbox onOpen={setChatId} />
              ) : (
                <Profile />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* bottom nav (hidden during onboarding & chat) */}
        {profile && !chatId && (
          <nav className="mx-auto mt-2 flex w-full max-w-md items-center justify-around rounded-2xl bg-white/5 p-1.5 ring-1 ring-white/10 backdrop-blur-md">
            <NavButton
              active={tab === "swipe"}
              onClick={() => setTab("swipe")}
              label="Keşfet"
              icon="🔥"
            />
            <NavButton
              active={tab === "inbox"}
              onClick={() => setTab("inbox")}
              label="Eşleşmeler"
              icon="💬"
              badge={matchCount}
            />
            <NavButton
              active={tab === "profile"}
              onClick={() => setTab("profile")}
              label="Profil"
              icon="👤"
            />
          </nav>
        )}
      </main>
    </div>
  );
}

function NavButton({
  active,
  onClick,
  label,
  icon,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-xs transition ${
        active ? "text-white" : "text-white/50"
      }`}
    >
      {active && (
        <motion.span
          layoutId="nav-pill"
          className="absolute inset-0 -z-10 rounded-xl bg-white/10 ring-1 ring-white/10"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}
      <motion.span
        className="text-lg"
        animate={active ? { scale: 1.12, y: -1 } : { scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        {icon}
      </motion.span>
      {label}
      {badge ? (
        <span className="absolute right-4 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-pink-500 px-1 text-[10px] font-bold text-white shadow-[0_0_12px_rgba(236,72,153,0.7)]">
          {badge}
        </span>
      ) : null}
    </button>
  );
}
