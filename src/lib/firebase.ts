import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { initializeFirestore, type Firestore } from "firebase/firestore";

/**
 * Null-safe Firebase init.
 *
 * If the VITE_FIREBASE_* config isn't set, `auth`/`db` are `null` and the app
 * keeps running on its local/in-memory stores — the same opt-in, graceful
 * degradation as the Gemini key. Every persistence call guards on non-null.
 *
 * The Firebase web config is public by design (safe in the browser); Firestore
 * Security Rules are what actually protect data (see firestore.rules).
 */
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const enabled = Boolean(
  config.apiKey && config.authDomain && config.projectId && config.appId,
);

export const firebaseApp: FirebaseApp | null = enabled
  ? initializeApp(config)
  : null;
export const auth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;
// ignoreUndefinedProperties: UserProfile has many optional fields; undefined
// values would otherwise make setDoc throw.
export const db: Firestore | null = firebaseApp
  ? initializeFirestore(firebaseApp, { ignoreUndefinedProperties: true })
  : null;
export const isFirebaseEnabled = enabled;
