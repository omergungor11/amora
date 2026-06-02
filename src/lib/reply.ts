import type { Character } from "../types";
import type { Message } from "../store/useMatches";
import { useProfile } from "../store/useProfile";
import { ageFromDate } from "./astro";

/**
 * Compact, tasteful snapshot of the signed-in user, sent so characters can
 * reference shared ground. Sensitive fields (politics/religion) are omitted.
 */
function userContext() {
  const p = useProfile.getState().profile;
  if (!p) return undefined;
  return {
    name: p.name,
    age: ageFromDate(p.birthDate) ?? undefined,
    interests: p.interests,
    lookingFor: p.relationship,
    bio: p.bio,
  };
}

/**
 * The reply seam.
 * - Tries the Claude-backed proxy at /api/chat (key stays server-side).
 * - Falls back to a canned, in-character line if the API is unavailable
 *   (no key set, server down, etc.) so the UI always works.
 */

// Lightweight, human-ish fallback used only when the Claude API is unavailable.
// Mirrors the user's energy: greeting → greeting, short → short.
const GREETINGS = ["selam", "selaaam", "merhaba", "naber", "nbr", "hey", "slm", "sa"];
const greetingReplies = ["selaaam :)", "naber 😄", "iyiyim sen?", "heyy", "selam! nasılsın?"];
const shortReacts = ["hahah", "aynen 😄", "ciddi misin", "yok artık 😅", "kesinlikle", "öyle valla", "evet ya", "mantıklı"];
const followUps = ["sen ne yapıyosun bugün?", "anlatsana biraz", "sen nasılsın peki?", "e sonra?", "nerelisin bu arada?"];

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

function cannedReply(character: Character, history: Message[]): string {
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  const seed = history.length + character.id.charCodeAt(0);
  if (!lastUser) return pick(greetingReplies, seed);

  const text = lastUser.text.trim().toLowerCase().replace(/[!?.,]/g, "");
  // greeting → greeting
  if (GREETINGS.includes(text)) return pick(greetingReplies, seed);
  // very short message → short reaction, sometimes a light follow-up
  if (lastUser.text.trim().length <= 12) {
    return seed % 2 === 0 ? pick(shortReacts, seed) : pick(followUps, seed);
  }
  // longer message → reaction + occasional question (not every time)
  const react = pick(shortReacts, seed);
  return seed % 3 === 0 ? `${react} ${pick(followUps, seed + 1)}` : react;
}

/**
 * The character's first message after a match. Generated server-side from the
 * same style card so the opener already sounds like them; falls back to a
 * light, style-flavored canned line if the API is unavailable.
 */
export async function generateOpener(character: Character): Promise<string> {
  try {
    const res = await fetch("/api/opener", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: character.name,
        persona: character.persona,
        age: character.age,
        bio: character.bio,
        tags: character.tags,
        style: character.style,
        user: userContext(),
      }),
    });
    if (!res.ok) throw new Error(`api ${res.status}`);
    const data = (await res.json()) as { reply?: string };
    if (data.reply) return data.reply;
    throw new Error("empty opener");
  } catch {
    await new Promise((r) => setTimeout(r, 700 + Math.random() * 500));
    return cannedOpener(character);
  }
}

function cannedOpener(c: Character): string {
  const tag = c.tags[0] ?? "sohbet";
  const options = [
    `selaaam :) eşleştik demek`,
    `naber, nasıl gidiyor?`,
    `hey 👋 profilin dikkatimi çekti`,
    `selam! ${tag} kısmı ilgimi çekti açıkçası`,
    `oo eşleştik 😄 nasılsın?`,
  ];
  const idx = c.id.charCodeAt(c.id.length - 1) % options.length;
  return options[idx];
}

export async function generateReply(
  character: Character,
  history: Message[],
): Promise<string> {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: character.name,
        persona: character.persona,
        // structured profile → drives a per-character system prompt server-side
        age: character.age,
        bio: character.bio,
        tags: character.tags,
        style: character.style,
        user: userContext(),
        history: history
          .filter((m) => !m.pending)
          .map((m) => ({ role: m.role, text: m.text })),
      }),
    });
    if (!res.ok) throw new Error(`api ${res.status}`);
    const data = (await res.json()) as { reply?: string };
    if (data.reply) return data.reply;
    throw new Error("empty reply");
  } catch {
    // graceful fallback — keeps the app usable without an API key
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 600));
    return cannedReply(character, history);
  }
}
