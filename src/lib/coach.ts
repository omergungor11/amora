import { useProfile } from "../store/useProfile";

/**
 * AI Taste Coach — fetches a warm, model-written read on the user's "type",
 * blending the themes they swipe toward with their own profile. Returns null
 * on any failure so the caller can fall back to the local template insight.
 */
export async function generateInsight(tags: string[]): Promise<string | null> {
  if (tags.length === 0) return null;
  const p = useProfile.getState().profile;
  const user = p
    ? { interests: p.interests, lookingFor: p.relationship }
    : undefined;
  try {
    const res = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags, user }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { insight?: string };
    return data.insight?.trim() || null;
  } catch {
    return null;
  }
}
