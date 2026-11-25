import type { Personality } from "./types.js";

export interface FontFamily {
  /** Family name as published on Google Fonts. */
  name: string;
  /** CSS fallback stack appended after the family. */
  fallback: string;
  /** Weights to request. */
  weights: number[];
}

export interface FontPairing {
  id: string;
  label: string;
  heading: FontFamily;
  body: FontFamily;
  mono: FontFamily;
  personalities: Personality[];
}

const SANS = "ui-sans-serif, system-ui, sans-serif";
const SERIF = "ui-serif, Georgia, serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

const f = (name: string, fallback: string, weights: number[] = [400, 600, 700]): FontFamily => ({
  name,
  fallback,
  weights,
});

/**
 * Curated pairings. Every family is published on Google Fonts under the SIL
 * Open Font License, so generated brand kits are safe to use commercially.
 * Fonts are referenced by name, never bundled.
 */
export const FONT_PAIRINGS: FontPairing[] = [
  {
    id: "inter",
    label: "Inter + JetBrains Mono",
    heading: f("Inter", SANS),
    body: f("Inter", SANS),
    mono: f("JetBrains Mono", MONO, [400, 600]),
    personalities: ["professional", "technical"],
  },
  {
    id: "space-grotesk",
    label: "Space Grotesk + Inter",
    heading: f("Space Grotesk", SANS, [500, 700]),
    body: f("Inter", SANS),
    mono: f("JetBrains Mono", MONO, [400, 600]),
    personalities: ["technical", "bold"],
  },
  {
    id: "plex",
    label: "IBM Plex Sans + IBM Plex Mono",
    heading: f("IBM Plex Sans", SANS),
    body: f("IBM Plex Sans", SANS),
    mono: f("IBM Plex Mono", MONO, [400, 600]),
    personalities: ["technical"],
  },
  {
    id: "fraunces",
    label: "Fraunces + Inter",
    heading: f("Fraunces", SERIF, [600, 700]),
    body: f("Inter", SANS),
    mono: f("JetBrains Mono", MONO, [400, 600]),
    personalities: ["warm", "luxurious"],
  },
  {
    id: "playfair",
    label: "Playfair Display + Lora",
    heading: f("Playfair Display", SERIF, [600, 700]),
    body: f("Lora", SERIF, [400, 600]),
    mono: f("IBM Plex Mono", MONO, [400, 600]),
    personalities: ["luxurious"],
  },
  {
    id: "nunito",
    label: "Nunito + Nunito Sans",
    heading: f("Nunito", SANS, [700, 800]),
    body: f("Nunito Sans", SANS),
    mono: f("JetBrains Mono", MONO, [400, 600]),
    personalities: ["friendly", "warm"],
  },
  {
    id: "outfit",
    label: "Outfit + DM Sans",
    heading: f("Outfit", SANS, [600, 700]),
    body: f("DM Sans", SANS),
    mono: f("JetBrains Mono", MONO, [400, 600]),
    personalities: ["playful", "bold"],
  },
  {
    id: "manrope",
    label: "Manrope + Source Serif 4",
    heading: f("Manrope", SANS, [600, 800]),
    body: f("Source Serif 4", SERIF, [400, 600]),
    mono: f("IBM Plex Mono", MONO, [400, 600]),
    personalities: ["calm"],
  },
];

export function getFontPairing(id: string): FontPairing {
  const pairing = FONT_PAIRINGS.find((p) => p.id === id);
  if (!pairing) {
    const ids = FONT_PAIRINGS.map((p) => p.id).join(", ");
    throw new Error(`Unknown font pairing "${id}". Available: ${ids}.`);
  }
  return pairing;
}

/**
 * Picks the pairing that best matches the personalities. Ties go to the more
 * specialised pairing (fewer tags), then to list order.
 */
export function pickFontPairing(personalities: Personality[]): FontPairing {
  let best = FONT_PAIRINGS[0] as FontPairing;
  let bestScore = -1;
  for (const pairing of FONT_PAIRINGS) {
    const score = personalities.reduce(
      // Earlier personalities in the answer count more.
      (sum, p, i) => sum + (pairing.personalities.includes(p) ? personalities.length - i : 0),
      0,
    );
    const tieBreak =
      score === bestScore && pairing.personalities.length < best.personalities.length;
    if (score > bestScore || tieBreak) {
      best = pairing;
      bestScore = score;
    }
  }
  return best;
}

export function fontStack(family: FontFamily): string {
  const name = /\s/.test(family.name) ? `"${family.name}"` : family.name;
  return `${name}, ${family.fallback}`;
}

/** Google Fonts CSS2 URL for every family in a pairing. */
export function googleFontsUrl(pairing: FontPairing): string {
  const families = new Map<string, Set<number>>();
  for (const fam of [pairing.heading, pairing.body, pairing.mono]) {
    const weights = families.get(fam.name) ?? new Set<number>();
    fam.weights.forEach((w) => weights.add(w));
    families.set(fam.name, weights);
  }
  const params = [...families]
    .map(([name, weights]) => {
      const w = [...weights].sort((a, b) => a - b).join(";");
      return `family=${name.replace(/ /g, "+")}:wght@${w}`;
    })
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}
