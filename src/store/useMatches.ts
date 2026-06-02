import { create } from "zustand";
import type { Character } from "../types";
import { saveMatch, saveMessage } from "../lib/db";

export type Message = {
  id: string;
  role: "user" | "character";
  text: string;
  /** when true, render the typing indicator instead of text */
  pending?: boolean;
};

export type Conversation = {
  character: Character;
  messages: Message[];
};

let seq = 0;
const nextId = () => `m${++seq}`;

type MatchesState = {
  /** character.id -> conversation */
  conversations: Record<string, Conversation>;
  /** order of matches, newest first */
  order: string[];
  /** create a match; the opener starts as a pending (typing) message */
  addMatch: (character: Character) => void;
  /** fill the pending opener once the style-driven line is generated */
  resolveOpener: (id: string, text: string) => void;
  /** replace state with conversations loaded from Firestore */
  hydrate: (convs: Conversation[]) => void;
  hasMatch: (id: string) => boolean;
  appendUser: (id: string, text: string) => void;
  /** insert a pending (typing) character message, returns its id */
  startCharacterReply: (id: string) => string;
  /** resolve a pending character message with final text */
  finishCharacterReply: (id: string, msgId: string, text: string) => void;
};

export const useMatches = create<MatchesState>((set, get) => ({
  conversations: {},
  order: [],
  addMatch: (character) => {
    if (get().conversations[character.id]) return;
    set((s) => ({
      order: [character.id, ...s.order],
      conversations: {
        ...s.conversations,
        [character.id]: {
          character,
          // opener arrives as a "typing" bubble, filled by resolveOpener
          messages: [{ id: nextId(), role: "character", text: "", pending: true }],
        },
      },
    }));
    void saveMatch(character.id); // persist (no-op if Firebase disabled)
  },
  resolveOpener: (id, text) => {
    const conv = get().conversations[id];
    const first = conv?.messages[0];
    if (!conv || !first?.pending) return; // already resolved / user moved on
    set((s) => ({
      conversations: {
        ...s.conversations,
        [id]: {
          ...conv,
          messages: conv.messages.map((m) =>
            m.id === first.id ? { ...m, text, pending: false } : m,
          ),
        },
      },
    }));
    void saveMessage(id, "character", text);
  },
  hydrate: (convs) =>
    set(() => {
      const conversations: Record<string, Conversation> = {};
      const order: string[] = [];
      for (const c of convs) {
        conversations[c.character.id] = c;
        order.push(c.character.id);
      }
      return { conversations, order };
    }),
  hasMatch: (id) => Boolean(get().conversations[id]),
  appendUser: (id, text) => {
    if (!get().conversations[id]) return;
    set((s) => {
      const conv = s.conversations[id];
      return {
        conversations: {
          ...s.conversations,
          [id]: {
            ...conv,
            messages: [...conv.messages, { id: nextId(), role: "user", text }],
          },
        },
      };
    });
    void saveMessage(id, "user", text);
  },
  startCharacterReply: (id) => {
    const msgId = nextId();
    set((s) => {
      const conv = s.conversations[id];
      if (!conv) return s;
      return {
        conversations: {
          ...s.conversations,
          [id]: {
            ...conv,
            messages: [
              ...conv.messages,
              { id: msgId, role: "character", text: "", pending: true },
            ],
          },
        },
      };
    });
    return msgId;
  },
  finishCharacterReply: (id, msgId, text) => {
    set((s) => {
      const conv = s.conversations[id];
      if (!conv) return s;
      return {
        conversations: {
          ...s.conversations,
          [id]: {
            ...conv,
            messages: conv.messages.map((m) =>
              m.id === msgId ? { ...m, text, pending: false } : m,
            ),
          },
        },
      };
    });
    void saveMessage(id, "character", text);
  },
}));
