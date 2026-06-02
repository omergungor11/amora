import { auth } from "./firebase";
import {
  signInAnonymously,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  linkWithPopup,
  type User,
} from "firebase/auth";

/**
 * Anonymous-first session bootstrap. Resolves the persisted user (if any),
 * else signs in anonymously so every doc can be keyed to a stable uid; later
 * the user links Google to the SAME uid (data preserved).
 *
 * No-op (null) when Firebase isn't configured — the app runs on local stores.
 */
export async function ensureSession(): Promise<User | null> {
  if (!auth) return null;
  try {
    const existing = await new Promise<User | null>((resolve) => {
      const unsub = onAuthStateChanged(auth!, (u) => {
        unsub();
        resolve(u);
      });
    });
    if (existing) return existing;

    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (err) {
    // Most likely: anonymous auth disabled in the project. Degrade quietly.
    console.warn("[firebase] anonymous sign-in unavailable:", err);
    return null;
  }
}

/** Current user id (uid) if signed in, else null. */
export function currentUserId(): string | null {
  return auth?.currentUser?.uid ?? null;
}

/** Whether the current user is still anonymous (not yet linked to Google). */
export function isAnonymous(): boolean {
  return auth?.currentUser?.isAnonymous ?? false;
}

/**
 * Convert the anonymous user into a permanent Google account, keeping the same
 * uid so all existing data stays attached. On a brand-new device (no anon user)
 * or if that Google account already exists, falls back to a normal Google
 * sign-in. Returns the signed-in user, or null when Firebase isn't configured.
 */
export async function linkGoogle(): Promise<User | null> {
  if (!auth) return null;
  const provider = new GoogleAuthProvider();
  const user = auth.currentUser;
  try {
    if (user?.isAnonymous) {
      const cred = await linkWithPopup(user, provider);
      return cred.user;
    }
    const cred = await signInWithPopup(auth, provider);
    return cred.user;
  } catch (err) {
    const code = (err as { code?: string })?.code;
    // That Google account is already a separate user → just sign into it.
    if (code === "auth/credential-already-in-use" || code === "auth/email-already-in-use") {
      const cred = await signInWithPopup(auth, provider);
      return cred.user;
    }
    console.warn("[firebase] Google link/sign-in failed:", err);
    return null;
  }
}
