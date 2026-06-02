import { useState } from "react";
import SwipeDeck from "../components/SwipeDeck";
import DiscoverySheet from "../components/DiscoverySheet";
import LikedYouSheet from "../components/LikedYouSheet";
import UpsellSheet from "../components/UpsellSheet";
import type { InterestedIn } from "../types";

type Props = {
  name: string;
  interestedIn: InterestedIn;
  onOpenChat: (characterId: string) => void;
};

export default function SwipeScreen({ name, interestedIn, onOpenChat }: Props) {
  const [showFilters, setShowFilters] = useState(false);
  const [showLikedYou, setShowLikedYou] = useState(false);
  const [showPremium, setShowPremium] = useState(false);

  return (
    <div className="mx-auto flex h-full max-w-md flex-col px-2">
      <header className="flex items-center justify-between py-3">
        <h1 className="bg-gradient-to-r from-pink-400 to-violet-400 bg-clip-text text-2xl font-black text-transparent">
          Amora
        </h1>
        <div className="flex items-center gap-2">
          <span className="mr-1 text-sm text-white/60">Merhaba, {name} 👋</span>
          <button
            onClick={() => setShowLikedYou(true)}
            aria-label="Seni beğenenler"
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-lg ring-1 ring-white/15 active:scale-90"
          >
            💜
          </button>
          <button
            onClick={() => setShowFilters(true)}
            aria-label="Keşif ayarları"
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-lg ring-1 ring-white/15 active:scale-90"
          >
            🎚️
          </button>
        </div>
      </header>
      <div className="min-h-0 flex-1">
        <SwipeDeck interestedIn={interestedIn} onOpenChat={onOpenChat} />
      </div>

      {showFilters && <DiscoverySheet onClose={() => setShowFilters(false)} />}
      {showLikedYou && (
        <LikedYouSheet
          onClose={() => setShowLikedYou(false)}
          onUpsell={() => setShowPremium(true)}
          onOpenChat={onOpenChat}
        />
      )}
      {showPremium && (
        <UpsellSheet context="store" onClose={() => setShowPremium(false)} />
      )}
    </div>
  );
}
