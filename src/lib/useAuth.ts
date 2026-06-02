import { useEffect, useState } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, type User } from "firebase/auth";

/** Reactive auth state for UI (anonymous vs Google-linked). */
export function useAuth() {
  const [user, setUser] = useState<User | null>(auth?.currentUser ?? null);
  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, setUser);
  }, []);
  return {
    enabled: Boolean(auth),
    user,
    isAnonymous: user?.isAnonymous ?? false,
    email: user?.email ?? null,
  };
}
