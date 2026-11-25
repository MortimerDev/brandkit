import { type Color, type Oklch, fromHex, fromOklch } from "./color.js";

export const SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type ScaleStep = (typeof SCALE_STEPS)[number];
export type Scale = Record<ScaleStep, Color>;

/** Target OKLCH lightness for each step, light to dark. */
const LIGHTNESS: Record<ScaleStep, number> = {
  50: 0.975,
  100: 0.94,
  200: 0.885,
  300: 0.81,
  400: 0.72,
  500: 0.635,
  600: 0.555,
  700: 0.475,
  800: 0.395,
  900: 0.315,
  950: 0.235,
};

/** Share of the base chroma used at each step; tints and shades get less. */
const CHROMA: Record<ScaleStep, number> = {
  50: 0.12,
  100: 0.26,
  200: 0.46,
  300: 0.7,
  400: 0.9,
  500: 1,
  600: 1,
  700: 0.92,
  800: 0.8,
  900: 0.66,
  950: 0.5,
};

export interface ScaleOptions {
  /**
   * Keep the exact input colour at the step whose lightness is closest.
   * Default true for brand colours, so the colour people picked survives.
   */
  keepBase?: boolean;
  /** Override the base chroma (e.g. very low for neutrals). */
  chroma?: number;
}

export interface GeneratedScale {
  scale: Scale;
  /** Step that holds the exact input colour, if `keepBase` was used. */
  baseStep: ScaleStep | null;
}

export function closestStep(lightness: number): ScaleStep {
  let best: ScaleStep = 500;
  let bestDiff = Infinity;
  for (const step of SCALE_STEPS) {
    const diff = Math.abs(LIGHTNESS[step] - lightness);
    if (diff < bestDiff) {
      best = step;
      bestDiff = diff;
    }
  }
  return best;
}

/** Builds an 11-step scale (50–950) around a colour in OKLCH space. */
export function generateScale(base: Color | string, options: ScaleOptions = {}): GeneratedScale {
  const color = typeof base === "string" ? fromHex(base) : base;
  const { h } = color.oklch;
  const baseChroma = options.chroma ?? color.oklch.c;
  const keepBase = options.keepBase ?? true;

  const scale = {} as Scale;
  for (const step of SCALE_STEPS) {
    const target: Oklch = { l: LIGHTNESS[step], c: baseChroma * CHROMA[step], h };
    scale[step] = fromOklch(target);
  }

  let baseStep: ScaleStep | null = null;
  if (keepBase) {
    baseStep = closestStep(color.oklch.l);
    scale[baseStep] = color;
  }
  return { scale, baseStep };
}

/** Low-chroma neutral scale tinted towards a hue. */
export function generateNeutralScale(hue: number, chroma: number): Scale {
  return generateScale(fromOklch({ l: 0.635, c: chroma, h: hue }), { keepBase: false, chroma })
    .scale;
}

export function rotateHue(color: Color, degrees: number, chroma?: number): Color {
  const h = (((color.oklch.h + degrees) % 360) + 360) % 360;
  return fromOklch({ l: color.oklch.l, c: chroma ?? color.oklch.c, h });
}
