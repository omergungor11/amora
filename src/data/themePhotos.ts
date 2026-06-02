import type { Character } from "../types";

/**
 * Stock photos can't give an AI character a second photo of the *same face*,
 * so — like real dating profiles — we add interest/lifestyle shots derived from
 * the character's tags. Each character's gallery = [portrait, ...themed].
 */
const THEME: Record<string, string> = {
  kahve: "1495474472287-4d71bcdd2085",
  çay: "1495474472287-4d71bcdd2085",
  müzik: "1511671782779-c97d3d27a1d4",
  konser: "1511671782779-c97d3d27a1d4",
  vinil: "1511671782779-c97d3d27a1d4",
  kitap: "1481627834876-b7833e8f5570",
  doğa: "1441974231531-c6227db76b6e",
  seyahat: "1488646953014-85cb44e25828",
  yemek: "1504674900247-0877df9cc836",
  şef: "1504674900247-0877df9cc836",
  gurme: "1504674900247-0877df9cc836",
  sanat: "1513364776144-60967b0f800f",
  çizim: "1513364776144-60967b0f800f",
  seramik: "1513364776144-60967b0f800f",
  koşu: "1571019613454-1cb2f99b2d8b",
  spor: "1571019613454-1cb2f99b2d8b",
  maraton: "1571019613454-1cb2f99b2d8b",
  sağlık: "1571019613454-1cb2f99b2d8b",
  şarap: "1510812431401-41d2bd2722f3",
  dans: "1504609773096-104ff2c73ba4",
  fotoğraf: "1452780212940-6f5c0d14d848",
  sinema: "1452780212940-6f5c0d14d848",
  sörf: "1502680390469-be75c86b636f",
  tırmanış: "1522163182402-834f871fd851",
  kamp: "1504280390367-361c6d9f38f4",
  oyun: "1542751371-adc38448a05e",
  anime: "1542751371-adc38448a05e",
  mimari: "1487958449943-2429e8be8625",
  teknoloji: "1518770660439-4636190af475",
  girişim: "1518770660439-4636190af475",
  hayvan: "1425082661705-1834bfd09dca",
  kedi: "1514888286974-6c03e2ca1dba",
  gece: "1566737236500-c8ac43014a67",
  hukuk: "1487958449943-2429e8be8625",
};
const FALLBACK = "1488646953014-85cb44e25828"; // travel

const url = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=800&q=80&fit=crop`;

/** Portrait + up to two distinct themed shots from the character's top tags. */
export function characterPhotos(c: Character): string[] {
  const themed: string[] = [];
  for (const tag of c.tags) {
    const id = THEME[tag];
    if (!id) continue;
    const u = url(id);
    if (!themed.includes(u)) themed.push(u);
    if (themed.length >= 2) break;
  }
  if (themed.length === 0) themed.push(url(FALLBACK));
  return [c.photo, ...themed];
}
