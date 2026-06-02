import {
  loadProfile, saveProfile, loadSwipes, loadMatches, loadMessages, loadEconomy,
} from "./db";
import { useProfile } from "../store/useProfile";
import { useTaste } from "../store/useTaste";
import { useEconomy } from "../store/useEconomy";
import { useMatches, type Conversation } from "../store/useMatches";
import { characters } from "../data/characters";

const byId = new Map(characters.map((c) => [c.id, c]));

/**
 * After the session is ready, reconcile local stores with Firestore.
 * - Profile: remote wins if present; else push the local profile up (seed).
 * - Swipes:  replay into the Taste Coach (rebuilds taste + deck dedupe).
 * - Matches+messages: rebuild conversations.
 * No-op when Firebase is disabled (loaders return empty/null).
 */
export async function hydrateFromFirebase(): Promise<void> {
  try {
    // profile
    const remote = await loadProfile();
    if (remote) {
      useProfile.setState({ profile: remote });
    } else {
      const local = useProfile.getState().profile;
      if (local) await saveProfile(local);
    }

    // swipes → taste + seen
    const swipes = await loadSwipes();
    if (swipes.length) useTaste.getState().hydrate(swipes);

    // economy → daily quota + credits + premium
    const economy = await loadEconomy();
    if (economy) useEconomy.getState().hydrate(economy);

    // matches + messages → conversations
    const matches = await loadMatches(); // newest first
    if (matches.length) {
      const convs = await Promise.all(
        matches.map(async (m): Promise<Conversation | null> => {
          const character = byId.get(m.characterId);
          if (!character) return null;
          const msgs = await loadMessages(m.characterId);
          return {
            character,
            messages: msgs.map((x, i) => ({
              id: `h-${m.characterId}-${i}`,
              role: x.role,
              text: x.content,
            })),
          };
        }),
      );
      useMatches.getState().hydrate(convs.filter((c): c is Conversation => c !== null));
    }
  } catch (err) {
    console.warn("[firebase] hydrate failed:", err);
  }
}
