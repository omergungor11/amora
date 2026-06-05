import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { isFirebaseEnabled } from "./lib/firebase";
import { ensureSession } from "./lib/session";
import { hydrateFromFirebase } from "./lib/sync";
import { startMatchSync } from "./lib/realtime";

// Anonymous-first: establish a session up front, then reconcile local stores
// with Firestore. Fire-and-forget — the UI never waits on it, and it's a no-op
// when Firebase isn't configured.
if (isFirebaseEnabled) {
  ensureSession().then(async (u) => {
    if (u) {
      await hydrateFromFirebase();
      startMatchSync(); // live real-match sync (both participants, no reload)
      console.info("[firebase] session ready (anonymous-first), data synced");
    } else {
      console.info("[firebase] no session — running on local stores");
    }
  });
} else {
  console.info("[firebase] not configured — running on local stores");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
