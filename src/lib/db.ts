import { db, auth } from "./firebase";
import {
  doc, getDoc, setDoc, collection, getDocs, addDoc, query, orderBy,
} from "firebase/firestore";
import type { UserProfile, SwipeDir } from "../types";
import { normalizeProfile } from "./profile";

/**
 * Firestore persistence layer. Every function is null-safe: when Firebase isn't
 * configured (or there's no session yet) it no-ops / returns null, so callers
 * fall back to local state. Data lives under users/{uid}/… (see firestore.rules).
 */
function uid(): string | null {
  return auth?.currentUser?.uid ?? null;
}

// ── profile ──────────────────────────────────────────────────────
export async function loadProfile(): Promise<UserProfile | null> {
  if (!db) return null;
  const id = uid();
  if (!id) return null;
  const snap = await getDoc(doc(db, "users", id));
  return snap.exists() ? normalizeProfile(snap.data()) : null;
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  if (!db) return;
  const id = uid();
  if (!id) return;
  try {
    await setDoc(doc(db, "users", id), profile, { merge: true });
  } catch (err) {
    console.warn("[firebase] saveProfile failed:", err);
  }
}

// ── swipes ───────────────────────────────────────────────────────
export type SwipeRow = { characterId: string; direction: SwipeDir };

export async function saveSwipe(characterId: string, direction: SwipeDir): Promise<void> {
  if (!db) return;
  const id = uid();
  if (!id) return;
  try {
    await setDoc(doc(db, "users", id, "swipes", characterId), {
      direction,
      createdAt: Date.now(),
    });
  } catch (err) {
    console.warn("[firebase] saveSwipe failed:", err);
  }
}

export async function loadSwipes(): Promise<SwipeRow[]> {
  if (!db) return [];
  const id = uid();
  if (!id) return [];
  const snap = await getDocs(collection(db, "users", id, "swipes"));
  return snap.docs.map((d) => ({
    characterId: d.id,
    direction: d.data().direction as SwipeDir,
  }));
}

// ── matches ──────────────────────────────────────────────────────
export async function saveMatch(characterId: string): Promise<void> {
  if (!db) return;
  const id = uid();
  if (!id) return;
  try {
    await setDoc(
      doc(db, "users", id, "matches", characterId),
      { createdAt: Date.now() },
      { merge: true },
    );
  } catch (err) {
    console.warn("[firebase] saveMatch failed:", err);
  }
}

export type MatchRow = { characterId: string; createdAt: number };

export async function loadMatches(): Promise<MatchRow[]> {
  if (!db) return [];
  const id = uid();
  if (!id) return [];
  const snap = await getDocs(
    query(collection(db, "users", id, "matches"), orderBy("createdAt", "desc")),
  );
  return snap.docs.map((d) => ({
    characterId: d.id,
    createdAt: (d.data().createdAt as number) ?? 0,
  }));
}

// ── economy (daily like quota, credits, premium) ─────────────────
export type EconomyRow = {
  likeLimit: number;
  likesUsedToday: number;
  dayStamp: string; // local YYYY-MM-DD; quota resets when it changes
  superLikes: number;
  boosts: number;
  premium: boolean;
};

export async function saveEconomy(row: EconomyRow): Promise<void> {
  if (!db) return;
  const id = uid();
  if (!id) return;
  try {
    await setDoc(doc(db, "users", id, "meta", "economy"), row, { merge: true });
  } catch (err) {
    console.warn("[firebase] saveEconomy failed:", err);
  }
}

export async function loadEconomy(): Promise<EconomyRow | null> {
  if (!db) return null;
  const id = uid();
  if (!id) return null;
  const snap = await getDoc(doc(db, "users", id, "meta", "economy"));
  return snap.exists() ? (snap.data() as EconomyRow) : null;
}

// ── messages (subcollection under a match) ───────────────────────
export type MessageRow = { role: "user" | "character"; content: string };

export async function saveMessage(
  characterId: string,
  role: "user" | "character",
  content: string,
): Promise<void> {
  if (!db) return;
  const id = uid();
  if (!id) return;
  try {
    await addDoc(collection(db, "users", id, "matches", characterId, "messages"), {
      role,
      content,
      createdAt: Date.now(),
    });
  } catch (err) {
    console.warn("[firebase] saveMessage failed:", err);
  }
}

export async function loadMessages(characterId: string): Promise<MessageRow[]> {
  if (!db) return [];
  const id = uid();
  if (!id) return [];
  const snap = await getDocs(
    query(
      collection(db, "users", id, "matches", characterId, "messages"),
      orderBy("createdAt"),
    ),
  );
  return snap.docs.map((d) => ({
    role: d.data().role as "user" | "character",
    content: d.data().content as string,
  }));
}
