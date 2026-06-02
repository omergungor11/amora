import type { UserProfile } from "../types";

/**
 * Normalize a profile loaded from storage. Migrates the old single-`photo`
 * shape to the `photos` array so existing local/Firestore profiles keep working.
 */
export function normalizeProfile(p: unknown): UserProfile | null {
  if (!p || typeof p !== "object") return null;
  const obj = p as Record<string, unknown> & { photo?: string; photos?: string[] };
  if (!Array.isArray(obj.photos)) {
    obj.photos = typeof obj.photo === "string" && obj.photo ? [obj.photo] : [];
  }
  delete obj.photo;
  return obj as unknown as UserProfile;
}
