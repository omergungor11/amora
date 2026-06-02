/**
 * Option sets for the profile form. Each entry is { value, label, emoji? }.
 * Values are stored on the profile; labels/emojis are for display. Shared
 * between the editor and the read-only profile view so they never drift.
 */
export type Option = { value: string; label: string; emoji?: string };

export const SMOKING: Option[] = [
  { value: "hayir", label: "İçmiyorum", emoji: "🚭" },
  { value: "sosyal", label: "Sosyal içerim", emoji: "🚬" },
  { value: "duzenli", label: "Düzenli", emoji: "🚬" },
  { value: "birakiyorum", label: "Bırakmaya çalışıyorum", emoji: "🌱" },
];

export const DRINKING: Option[] = [
  { value: "hayir", label: "İçmiyorum", emoji: "🚫" },
  { value: "sosyal", label: "Sosyal içerim", emoji: "🍷" },
  { value: "duzenli", label: "Düzenli", emoji: "🍸" },
];

export const EXERCISE: Option[] = [
  { value: "sik", label: "Sık sık", emoji: "🏋️" },
  { value: "arasira", label: "Ara sıra", emoji: "🚶" },
  { value: "nadiren", label: "Nadiren", emoji: "🛋️" },
];

export const DIET: Option[] = [
  { value: "hepci", label: "Her şey", emoji: "🍽️" },
  { value: "vejetaryen", label: "Vejetaryen", emoji: "🥗" },
  { value: "vegan", label: "Vegan", emoji: "🌱" },
  { value: "pesketaryen", label: "Pesketaryen", emoji: "🐟" },
];

export const POLITICS: Option[] = [
  { value: "sol", label: "Sol", emoji: "🌹" },
  { value: "merkez-sol", label: "Merkez sol" },
  { value: "merkez", label: "Merkez", emoji: "⚖️" },
  { value: "merkez-sag", label: "Merkez sağ" },
  { value: "sag", label: "Sağ", emoji: "🦅" },
  { value: "apolitik", label: "Apolitik", emoji: "🤷" },
];

export const RELIGION: Option[] = [
  { value: "dindar", label: "Dindar", emoji: "🕌" },
  { value: "maneviyatci", label: "Maneviyatçı", emoji: "🔮" },
  { value: "agnostik", label: "Agnostik", emoji: "🤔" },
  { value: "ateist", label: "Ateist", emoji: "🚀" },
  { value: "belirtmek-istemiyorum", label: "Belirtmek istemiyorum" },
];

export const KIDS: Option[] = [
  { value: "istiyorum", label: "İstiyorum", emoji: "👶" },
  { value: "istemiyorum", label: "İstemiyorum", emoji: "🚫" },
  { value: "emin-degilim", label: "Emin değilim", emoji: "🤷" },
  { value: "zaten-var", label: "Zaten var", emoji: "👨‍👧" },
];

// Animal attitudes — used for both cats and dogs.
export const PET_ATTITUDE: Option[] = [
  { value: "bayilirim", label: "Bayılırım", emoji: "😍" },
  { value: "bende-var", label: "Bende var", emoji: "🏠" },
  { value: "severim", label: "Severim", emoji: "🙂" },
  { value: "alerjim-var", label: "Alerjim var", emoji: "🤧" },
  { value: "uzak-dururum", label: "Uzak dururum", emoji: "🙅" },
];

export const RELATIONSHIP: Option[] = [
  { value: "ciddi", label: "Ciddi ilişki", emoji: "💍" },
  { value: "eglence", label: "Eğlence", emoji: "🎉" },
  { value: "arkadaslik", label: "Arkadaşlık", emoji: "🤝" },
  { value: "akisina-biraksin", label: "Akışına bıraksın", emoji: "🌊" },
  { value: "henuz-bilmiyorum", label: "Henüz bilmiyorum", emoji: "🤔" },
];

// Interests for the multi-select chip cloud (mirrors character tag vocabulary).
export const INTERESTS: string[] = [
  "sinema", "müzik", "kitap", "sanat", "fotoğraf", "seyahat", "kahve", "şarap",
  "yemek", "doğa", "kamp", "spor", "koşu", "yoga", "dans", "teknoloji", "oyun",
  "anime", "moda", "tarih", "bilim", "girişim", "hayvanlar", "gece hayatı",
];

/** Look up a label (with emoji) for a stored value in an option set. */
export function labelOf(options: Option[], value?: string): string | null {
  if (!value) return null;
  const o = options.find((x) => x.value === value);
  if (!o) return null;
  return o.emoji ? `${o.emoji} ${o.label}` : o.label;
}
