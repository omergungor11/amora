import { listenRealMatches, loadPublicProfile } from "./db";
import { profileToCard } from "./deck";
import { useMatches } from "../store/useMatches";
import { useBlocks } from "../store/useBlocks";

/**
 * Live sync of real user↔user matches into the matches store. Subscribes once
 * the session is ready; the snapshot fires immediately with existing matches
 * (so both participants — including the earlier liker — see the match without a
 * reload) and again whenever a new mutual match is created.
 */
let unsub: (() => void) | null = null;
const known = new Set<string>();

export function startMatchSync(): void {
  stopMatchSync();
  unsub = listenRealMatches(async (matches) => {
    for (const m of matches) {
      if (known.has(m.matchId)) continue;
      if (useBlocks.getState().isBlocked(m.otherUid)) continue; // hide blocked
      known.add(m.matchId);
      const prof = await loadPublicProfile(m.otherUid);
      if (!prof) {
        known.delete(m.matchId); // retry on the next snapshot
        continue;
      }
      useMatches.getState().addRealMatch(profileToCard(prof), m.matchId);
    }
  });
}

export function stopMatchSync(): void {
  if (unsub) unsub();
  unsub = null;
  known.clear();
}
