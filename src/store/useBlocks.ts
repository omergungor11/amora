import { create } from "zustand";
import { blockUser, loadBlocks } from "../lib/db";

/**
 * Users I've blocked. Kept reactive so discovery, the match sync, and the
 * liked-you sheet all hide blocked people immediately. Backed by the private
 * users/{me}/blocks subtree.
 */
type BlocksState = {
  blocked: string[];
  hydrate: () => Promise<void>;
  block: (uid: string) => Promise<void>;
  isBlocked: (uid: string) => boolean;
};

export const useBlocks = create<BlocksState>((set, get) => ({
  blocked: [],
  hydrate: async () => set({ blocked: await loadBlocks() }),
  block: async (uid) => {
    set((s) => ({ blocked: Array.from(new Set([...s.blocked, uid])) }));
    await blockUser(uid);
  },
  isBlocked: (uid) => get().blocked.includes(uid),
}));
