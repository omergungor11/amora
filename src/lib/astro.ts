/**
 * Lightweight astrology helpers for the profile screen.
 * - Sun sign (burç) is exact from the birth date.
 * - Rising sign (yükselen) uses the popular two-hour approximation
 *   (ascendant ≈ sun sign at ~6:00, advancing one sign every 2 hours).
 *   It needs only date + time, so it's an estimate, not an ephemeris result.
 */

export type Sign = {
  name: string;
  emoji: string;
  element: "Ateş" | "Toprak" | "Hava" | "Su";
};

// Zodiac order starting at Aries (index 0).
export const SIGNS: Sign[] = [
  { name: "Koç", emoji: "♈", element: "Ateş" },
  { name: "Boğa", emoji: "♉", element: "Toprak" },
  { name: "İkizler", emoji: "♊", element: "Hava" },
  { name: "Yengeç", emoji: "♋", element: "Su" },
  { name: "Aslan", emoji: "♌", element: "Ateş" },
  { name: "Başak", emoji: "♍", element: "Toprak" },
  { name: "Terazi", emoji: "♎", element: "Hava" },
  { name: "Akrep", emoji: "♏", element: "Su" },
  { name: "Yay", emoji: "♐", element: "Ateş" },
  { name: "Oğlak", emoji: "♑", element: "Toprak" },
  { name: "Kova", emoji: "♒", element: "Hava" },
  { name: "Balık", emoji: "♓", element: "Su" },
];

// Inclusive start day for each sign within its month, keyed [month][...].
// Returns the sun-sign index for a given month (1-12) and day.
function sunSignIndex(month: number, day: number): number {
  const cutoffs: [number, number][] = [
    [1, 20], // Kova starts Jan 20 → before that Oğlak
    [2, 19], // Balık
    [3, 21], // Koç
    [4, 20], // Boğa
    [5, 21], // İkizler
    [6, 21], // Yengeç
    [7, 23], // Aslan
    [8, 23], // Başak
    [9, 23], // Terazi
    [10, 23], // Akrep
    [11, 22], // Yay
    [12, 22], // Oğlak
  ];
  const [, cutoffDay] = cutoffs[month - 1];
  // sign index: Capricorn(9) for Dec22.., etc. Map month → sign with cutoff.
  // months map to "second sign" once past cutoff.
  const second = [10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]; // Kova..Oğlak
  const first = [9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8]; // Oğlak..Yay
  return day >= cutoffDay ? second[month - 1] : first[month - 1];
}

export function zodiac(birthDate: string): Sign | null {
  const d = parseDate(birthDate);
  if (!d) return null;
  return SIGNS[sunSignIndex(d.month, d.day)];
}

export function risingSign(birthDate: string, birthTime?: string): Sign | null {
  const sun = zodiac(birthDate);
  if (!sun || !birthTime) return null;
  const [h, m] = birthTime.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const sunIdx = SIGNS.indexOf(sun);
  // minutes from 6:00 (sunrise baseline), advance 1 sign / 120 min.
  const fromSunrise = (h * 60 + m - 360 + 1440) % 1440;
  const idx = (sunIdx + Math.floor(fromSunrise / 120)) % 12;
  return SIGNS[idx];
}

export function ageFromDate(birthDate: string, now = new Date()): number | null {
  const d = parseDate(birthDate);
  if (!d) return null;
  let age = now.getFullYear() - d.year;
  const hadBirthday =
    now.getMonth() + 1 > d.month ||
    (now.getMonth() + 1 === d.month && now.getDate() >= d.day);
  if (!hadBirthday) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

function parseDate(s: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const year = +m[1];
  const month = +m[2];
  const day = +m[3];
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}
