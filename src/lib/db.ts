import { db, auth } from "./firebase";
import {
  doc, getDoc, setDoc, collection, getDocs, addDoc, query, orderBy, where,
  onSnapshot,
} from "firebase/firestore";
import type { UserProfile, SwipeDir, PublicProfile } from "../types";
import { normalizeProfile } from "./profile";
import { ageFromDate } from "./astro";

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

// ── public profiles (real user↔user discovery) ───────────────────
/** Card-safe projection written to the public `profiles/{uid}` collection. */
function toPublic(p: UserProfile, id: string): PublicProfile | null {
  const age = ageFromDate(p.birthDate);
  if (age == null || !p.gender) return null; // not discoverable yet
  return {
    uid: id,
    name: p.name,
    age,
    gender: p.gender,
    interestedIn: p.interestedIn,
    photos: p.photos ?? [],
    bio: p.bio,
    lat: p.lat,
    lng: p.lng,
    locationLabel: p.locationLabel,
    interests: p.interests,
    traits: {
      smoking: p.smoking, drinking: p.drinking, exercise: p.exercise,
      diet: p.diet, politics: p.politics, religion: p.religion,
      kids: p.kids, cats: p.cats, dogs: p.dogs, socialEnergy: p.socialEnergy,
    },
    isAI: false,
    updatedAt: Date.now(),
  };
}

/** Mirror the card-safe subset of the profile to the public collection. */
export async function savePublicProfile(profile: UserProfile): Promise<void> {
  if (!db) return;
  const id = uid();
  if (!id) return;
  const pub = toPublic(profile, id);
  if (!pub) return; // missing required fields (age/gender) — skip until set
  try {
    await setDoc(doc(db, "profiles", id), pub, { merge: true });
  } catch (err) {
    console.warn("[firebase] savePublicProfile failed:", err);
  }
}

/**
 * Discovery: every other user's public profile. MVP fetches all and filters
 * client-side (gender/age/distance) — replace with geohash queries at scale.
 */
export async function loadCandidates(): Promise<PublicProfile[]> {
  if (!db) return [];
  const me = uid();
  const snap = await getDocs(collection(db, "profiles"));
  return snap.docs
    .map((d) => d.data() as PublicProfile)
    .filter((p) => p.uid && p.uid !== me);
}

// ── likes & reciprocal matches (real user↔user) ──────────────────
export type LikeKind = "like" | "superlike";

/** Deterministic match id from a uid pair (sorted, so both sides agree). */
export function matchIdOf(a: string, b: string): string {
  return [a, b].sort().join("_");
}

/**
 * Record a directional like A→B. If B already liked A, it's a mutual match:
 * create the shared `matches/{matchId}` doc and return its id; else null.
 */
export async function sendLike(toUid: string, kind: LikeKind): Promise<string | null> {
  if (!db) return null;
  const me = uid();
  if (!me) return null;
  try {
    await setDoc(doc(db, "likes", `${me}_${toUid}`), {
      from: me, to: toUid, kind, createdAt: Date.now(),
    });
    const reverse = await getDoc(doc(db, "likes", `${toUid}_${me}`));
    if (!reverse.exists()) return null; // no reciprocity yet
    const matchId = matchIdOf(me, toUid);
    await setDoc(
      doc(db, "matches", matchId),
      { users: [me, toUid].sort(), createdAt: Date.now() },
      { merge: true },
    );
    return matchId;
  } catch (err) {
    console.warn("[firebase] sendLike failed:", err);
    return null;
  }
}

/** A single public profile by uid (e.g. the other side of a match). */
export async function loadPublicProfile(id: string): Promise<PublicProfile | null> {
  if (!db) return null;
  try {
    const s = await getDoc(doc(db, "profiles", id));
    return s.exists() ? (s.data() as PublicProfile) : null;
  } catch (err) {
    console.warn("[firebase] loadPublicProfile failed:", err);
    return null;
  }
}

export type RealMatch = { matchId: string; otherUid: string; createdAt: number };

function toRealMatch(id: string, data: Record<string, unknown>, me: string): RealMatch {
  const users = (data.users as string[]) ?? [];
  return {
    matchId: id,
    otherUid: users.find((u) => u !== me) ?? "",
    createdAt: (data.createdAt as number) ?? 0,
  };
}

/** Live subscription to my matches (real user↔user). Fires immediately with the
 *  current set, then on every change — powers first-liker visibility. */
export function listenRealMatches(cb: (matches: RealMatch[]) => void): () => void {
  const fdb = db;
  const me = uid();
  if (!fdb || !me) return () => {};
  const q = query(collection(fdb, "matches"), where("users", "array-contains", me));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => toRealMatch(d.id, d.data(), me)).filter((m) => m.otherUid)),
    (err) => console.warn("[firebase] listenRealMatches failed:", err),
  );
}

export type RealMessageRow = { id: string; from: string; text: string; createdAt: number };

/** Live subscription to a shared match thread, ordered oldest→newest. */
export function listenMessages(
  matchId: string,
  cb: (msgs: RealMessageRow[]) => void,
): () => void {
  const fdb = db;
  if (!fdb) return () => {};
  const q = query(collection(fdb, "matches", matchId, "messages"), orderBy("createdAt"));
  return onSnapshot(
    q,
    (snap) =>
      cb(
        snap.docs.map((d) => ({
          id: d.id,
          from: d.data().from as string,
          text: d.data().text as string,
          createdAt: (d.data().createdAt as number) ?? 0,
        })),
      ),
    (err) => console.warn("[firebase] listenMessages failed:", err),
  );
}

/** Write a message into a shared match thread. */
export async function sendRealMessage(matchId: string, text: string): Promise<void> {
  const fdb = db;
  const me = uid();
  if (!fdb || !me) return;
  try {
    await addDoc(collection(fdb, "matches", matchId, "messages"), {
      from: me, text, createdAt: Date.now(),
    });
  } catch (err) {
    console.warn("[firebase] sendRealMessage failed:", err);
  }
}

/** Public profiles of everyone who has liked me (powers "Seni Beğenenler"). */
export async function loadLikedBy(): Promise<PublicProfile[]> {
  const fdb = db;
  if (!fdb) return [];
  const me = uid();
  if (!me) return [];
  try {
    const snap = await getDocs(query(collection(fdb, "likes"), where("to", "==", me)));
    const fromIds = snap.docs.map((d) => d.data().from as string);
    const profiles = await Promise.all(
      fromIds.map(async (fid) => {
        const s = await getDoc(doc(fdb, "profiles", fid));
        return s.exists() ? (s.data() as PublicProfile) : null;
      }),
    );
    return profiles.filter((p): p is PublicProfile => p !== null);
  } catch (err) {
    console.warn("[firebase] loadLikedBy failed:", err);
    return [];
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
