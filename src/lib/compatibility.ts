import type { Character, UserProfile } from "../types";

/**
 * Profile ↔ character compatibility. Combines stated-interest overlap with
 * value/lifestyle/animal alignment so the deck reflects fit from the very
 * first swipe (better cold-start). Every field is optional-aware: a dimension
 * only contributes when BOTH sides have set it.
 *
 * Returns a raw score (roughly -6 .. +14). `compatPercent` maps it to a
 * friendly display percentage.
 */
export function scoreProfileMatch(
  profile: UserProfile,
  c: Character,
): number {
  let score = 0;
  const t = c.traits;

  // shared interests ↔ character tags (strongest, concrete signal)
  const interests = profile.interests ?? [];
  for (const tag of c.tags) if (interests.includes(tag)) score += 2;

  // animals
  score += petScore(profile.cats, t.cats);
  score += petScore(profile.dogs, t.dogs);

  // values
  score += politicsScore(profile.politics, t.politics);
  score += matchScore(profile.religion, t.religion, 2, -1);
  score += kidsScore(profile.kids, t.kids);

  // lifestyle
  score += matchScore(profile.smoking, t.smoking, 1, -1);
  score += matchScore(profile.drinking, t.drinking, 1, -0.5);
  score += matchScore(profile.diet, t.diet, 1.5, 0);
  score += matchScore(profile.exercise, t.exercise, 1, 0);

  // social energy closeness → -1 (opposite) .. +1 (identical)
  if (profile.socialEnergy != null && t.socialEnergy != null) {
    score += 1 - Math.abs(profile.socialEnergy - t.socialEnergy) / 50;
  }

  return score;
}

/** Map the raw score to a warm display percentage (dating apps skew high). */
export function compatPercent(profile: UserProfile, c: Character): number {
  const raw = scoreProfileMatch(profile, c);
  return Math.max(55, Math.min(99, Math.round(72 + raw * 2.2)));
}

/**
 * Whether the profile carries enough matchable data for compatibility to be
 * meaningful — gates the "%uyum" hint so it only appears once the user has
 * given the coach something to work with.
 */
export function hasSignal(profile: UserProfile): boolean {
  if ((profile.interests?.length ?? 0) > 0) return true;
  const fields = [
    profile.politics, profile.religion, profile.kids, profile.cats,
    profile.dogs, profile.smoking, profile.drinking, profile.diet,
    profile.exercise,
  ];
  const set = fields.filter(Boolean).length + (profile.socialEnergy != null ? 1 : 0);
  return set >= 2;
}

/**
 * Premium advanced filters as a HARD gate. A trait filter excludes a character
 * only when that character HAS the trait set and it falls outside the allowed
 * set (an undefined trait is kept, so we never over-filter on missing data).
 * `interests` requires at least one tag overlap. No active filters → passes.
 */
export function passesFilters(profile: UserProfile, c: Character): boolean {
  const f = profile.filters;
  if (!f) return true;
  const t = c.traits;

  const traitKeys = [
    "smoking", "drinking", "exercise", "diet", "politics", "religion", "kids",
  ] as const;
  for (const k of traitKeys) {
    const allowed = f[k];
    if (!allowed?.length) continue;
    const val = t[k];
    if (val != null && !allowed.includes(val)) return false;
  }

  if (f.interests?.length) {
    if (!c.tags.some((tag) => f.interests!.includes(tag))) return false;
  }
  return true;
}

/** Count of active advanced filters (for badges / "N filtre aktif"). */
export function activeFilterCount(profile: UserProfile | null): number {
  const f = profile?.filters;
  if (!f) return 0;
  return Object.values(f).filter((v) => Array.isArray(v) && v.length > 0).length;
}

export type CompatReason = { label: string; good: boolean };

/**
 * Human-readable breakdown of why a character does (or doesn't) fit — shown
 * when the user taps the compatibility hint. Only dimensions both sides set.
 */
export function compatBreakdown(profile: UserProfile, c: Character): CompatReason[] {
  const r: CompatReason[] = [];
  const t = c.traits;

  const shared = (profile.interests ?? []).filter((i) => c.tags.includes(i));
  if (shared.length) r.push({ label: `Ortak ilgi: ${shared.join(", ")}`, good: true });

  if (
    profile.politics && t.politics &&
    profile.politics !== "apolitik" && t.politics !== "apolitik"
  ) {
    const d = Math.abs((POL[profile.politics] ?? 2) - (POL[t.politics] ?? 2));
    if (d <= 1) r.push({ label: "Politik görüşleriniz yakın", good: true });
    else if (d >= 3) r.push({ label: "Politik görüşleriniz farklı", good: false });
  }

  if (profile.religion && t.religion && profile.religion === t.religion)
    r.push({ label: "Dünya görüşünüz örtüşüyor", good: true });

  if (profile.kids && t.kids) {
    if (profile.kids === t.kids)
      r.push({ label: "Çocuk konusunda aynı fikirdesiniz", good: true });
    else if (
      (profile.kids === "istiyorum" && t.kids === "istemiyorum") ||
      (profile.kids === "istemiyorum" && t.kids === "istiyorum")
    )
      r.push({ label: "Çocuk konusunda ayrışıyorsunuz", good: false });
  }

  const pos = (a?: string) => a === "bayilirim" || a === "bende-var" || a === "severim";
  const neg = (a?: string) => a === "alerjim-var" || a === "uzak-dururum";
  if (pos(profile.cats) && pos(t.cats)) r.push({ label: "İkiniz de kedi seversiniz 🐱", good: true });
  if (neg(profile.cats) && t.cats === "bende-var") r.push({ label: "Onun kedisi var, sen mesafelisin", good: false });
  if (pos(profile.dogs) && pos(t.dogs)) r.push({ label: "İkiniz de köpek seversiniz 🐶", good: true });
  if (neg(profile.dogs) && t.dogs === "bende-var") r.push({ label: "Onun köpeği var, sen mesafelisin", good: false });

  if (profile.diet && t.diet && profile.diet === t.diet)
    r.push({ label: "Beslenme tarzınız aynı", good: true });

  if (
    profile.socialEnergy != null && t.socialEnergy != null &&
    Math.abs(profile.socialEnergy - t.socialEnergy) <= 20
  )
    r.push({ label: "Sosyal enerjiniz benzer", good: true });

  return r;
}

const POL: Record<string, number> = {
  sol: 0,
  "merkez-sol": 1,
  merkez: 2,
  "merkez-sag": 3,
  sag: 4,
};

function politicsScore(a?: string, b?: string): number {
  if (!a || !b) return 0;
  if (a === "apolitik" || b === "apolitik") return a === b ? 1 : 0;
  const x = POL[a];
  const y = POL[b];
  if (x == null || y == null) return 0;
  return 2 - Math.abs(x - y); // +2 identical .. -2 opposite ends
}

// attitude polarity for pets
const PET: Record<string, number> = {
  bayilirim: 1,
  "bende-var": 1,
  severim: 0.5,
  "alerjim-var": -1,
  "uzak-dururum": -1,
};

function petScore(a?: string, b?: string): number {
  if (!a || !b) return 0;
  const up = PET[a] ?? 0;
  const cp = PET[b] ?? 0;
  // they live with an animal you avoid → meaningful mismatch
  if (up < 0 && b === "bende-var") return -3;
  return up * cp * 2; // aligned → +, opposite → −, both-dislike → +
}

function kidsScore(a?: string, b?: string): number {
  if (!a || !b) return 0;
  if (a === b) return 2;
  const opposite =
    (a === "istiyorum" && b === "istemiyorum") ||
    (a === "istemiyorum" && b === "istiyorum");
  return opposite ? -2 : 0;
}

function matchScore(a: string | undefined, b: string | undefined, hit: number, miss: number): number {
  if (!a || !b) return 0;
  return a === b ? hit : miss;
}
