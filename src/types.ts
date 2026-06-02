export type Gender = "woman" | "man";

/**
 * Structured "style card" for a character. Fed to the model up-front, under
 * clear headings, so every character keeps a distinct, consistent voice in
 * chat instead of collapsing into one generic AI tone.
 */
export type CharacterStyle = {
  /** mesajlaşma mekaniği: uzunluk, emoji, noktalama, büyük/küçük harf, argo */
  texting: string;
  /** sohbeti doğal olarak çektiği konular / tutkular */
  topics: string[];
  /** imza alışkanlıklar, tekrar eden ifadeler, mizah tarzı */
  quirks: string;
  /** flört / romantik enerji tarzı */
  flirt: string;
};

/**
 * Compatibility attributes — mirror the user-profile fields so the deck can
 * score profile↔character fit. Values use the same vocabularies as
 * `data/profileOptions.ts`. All optional.
 */
export type CharacterTraits = {
  smoking?: string;
  drinking?: string;
  exercise?: string;
  diet?: string;
  politics?: string;
  religion?: string;
  kids?: string;
  cats?: string;
  dogs?: string;
  socialEnergy?: number; // 0..100
};

export type Character = {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  /** city / short location line */
  location: string;
  bio: string;
  /** personality / interest tags — also drive the AI taste profile */
  tags: string[];
  /** one-line personality summary (high-level flavor) */
  persona: string;
  /** detailed, structured voice spec used to build the chat system prompt */
  style: CharacterStyle;
  /** compatibility attributes for profile↔character matching */
  traits: CharacterTraits;
  /** coordinates for real distance calc */
  lat: number;
  lng: number;
  photo: string;
  /** accent color used in the card gradient */
  accent: string;
};

export type SwipeDir = "like" | "pass" | "superlike";

export type InterestedIn = "women" | "men" | "everyone";

/** Kept for the swipe deck which only needs who to show. */
export type Preferences = {
  name: string;
  interestedIn: InterestedIn;
  lookingFor: string;
};

/**
 * Rich user profile. Only `name`, `birthDate` and at least one photo are
 * required (plus `interestedIn`, needed to build the deck); everything else is
 * optional and feeds matching + the Taste Coach. Persisted to localStorage.
 */
export type UserProfile = {
  // ── required ──
  name: string;
  birthDate: string; // ISO yyyy-mm-dd
  /** 1–4 photos (downscaled data URLs); photos[0] is the primary */
  photos: string[];
  interestedIn: InterestedIn;

  // ── astrology (auto-derived; inputs optional) ──
  birthTime?: string; // HH:mm — enables rising sign
  birthPlace?: string;

  // ── about ──
  bio?: string;
  height?: number; // cm
  job?: string;
  education?: string;
  relationship?: string; // RELATIONSHIP option value

  // ── lifestyle ──
  smoking?: string;
  drinking?: string;
  exercise?: string;
  diet?: string;

  // ── values ──
  politics?: string;
  religion?: string;
  kids?: string;

  // ── animals ──
  cats?: string; // PET_ATTITUDE value
  dogs?: string;

  // ── personality ──
  socialEnergy?: number; // 0 (içe dönük) .. 100 (dışa dönük)
  interests?: string[];

  // ── discovery preferences ──
  lat?: number;
  lng?: number;
  locationLabel?: string; // e.g. "İstanbul" (manual or reverse-geocoded)
  distanceKm?: number; // max distance to show (5–200)
  ageMin?: number;
  ageMax?: number;

  // ── advanced filters (Premium) ──
  // each key holds the set of allowed values; an empty/absent key = no filter.
  // trait keys mirror CharacterTraits; `interests` filters on character tags.
  filters?: {
    smoking?: string[];
    drinking?: string[];
    exercise?: string[];
    diet?: string[];
    politics?: string[];
    religion?: string[];
    kids?: string[];
    interests?: string[];
  };
};

/** Advanced-filter keys gated behind Premium (P3). */
export type FilterKey = keyof NonNullable<UserProfile["filters"]>;
