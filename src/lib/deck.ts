import type { Character, PublicProfile } from "../types";

/**
 * Adapt a real user's public profile into the deck's `Character` shape so the
 * existing SwipeCard / compatibility / deck code works unchanged. AI-only
 * fields (persona/style) are left empty — they're never read for real users,
 * who are matched reciprocally and chat as humans (not via Gemini).
 */
const ACCENTS = ["#f472b6", "#a78bfa", "#38bdf8", "#34d399", "#fbbf24", "#fb7185"];

function accentFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997;
  return ACCENTS[h % ACCENTS.length];
}

export function profileToCard(p: PublicProfile): Character {
  return {
    id: p.uid,
    name: p.name,
    age: p.age,
    gender: p.gender,
    location: p.locationLabel ?? "",
    bio: p.bio ?? "",
    tags: p.interests ?? [],
    persona: "",
    style: { texting: "", topics: [], quirks: "", flirt: "" },
    traits: p.traits ?? {},
    lat: p.lat,
    lng: p.lng,
    photo: p.photos?.[0] ?? "",
    photos: p.photos ?? [],
    accent: accentFor(p.uid),
    isAI: false,
  };
}
