/**
 * Colour maths: sRGB <-> OKLab/OKLCH, gamut mapping and WCAG 2 contrast.
 *
 * OKLab conversion matrices are from Björn Ottosson's reference
 * implementation (https://bottosson.github.io/posts/oklab/), public domain.
 */

export interface Oklch {
  /** Lightness, 0–1. */
  l: number;
  /** Chroma, 0–~0.37. */
  c: number;
  /** Hue in degrees, 0–360. */
  h: number;
}

export interface Rgb {
  /** Channels 0–1, gamma-encoded sRGB. */
  r: number;
  g: number;
  b: number;
}

/** A colour stored in both forms so exporters can pick a format. */
export interface Color {
  hex: string;
  oklch: Oklch;
}

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHex(value: string): boolean {
  return HEX_RE.test(value.trim());
}

export function parseHex(value: string): Rgb {
  const match = HEX_RE.exec(value.trim());
  if (!match?.[1]) {
    throw new Error(`Invalid hex colour "${value}". Use #rgb or #rrggbb.`);
  }
  let hex = match[1];
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }
  const n = Number.parseInt(hex, 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

export function toHex({ r, g, b }: Rgb): string {
  const channel = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function rgbToOklch(rgb: Rgb): Oklch {
  const r = toLinear(rgb.r);
  const g = toLinear(rgb.g);
  const b = toLinear(rgb.b);

  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const c = Math.sqrt(A * A + B * B);
  let h = (Math.atan2(B, A) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: L, c, h: c < 1e-4 ? 0 : h };
}

/** Converts to sRGB without clamping; channels may fall outside 0–1. */
export function oklchToRgbUnclamped({ l, c, h }: Oklch): Rgb {
  const hr = (h * Math.PI) / 180;
  const A = c * Math.cos(hr);
  const B = c * Math.sin(hr);

  const l_ = l + 0.3963377774 * A + 0.2158037573 * B;
  const m_ = l - 0.1055613458 * A - 0.0638541728 * B;
  const s_ = l - 0.0894841775 * A - 1.291485548 * B;

  const L = l_ ** 3;
  const M = m_ ** 3;
  const S = s_ ** 3;

  return {
    r: toGamma(4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S),
    g: toGamma(-1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S),
    b: toGamma(-0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S),
  };
}

const EPS = 1e-6;

export function inSrgbGamut(oklch: Oklch): boolean {
  const { r, g, b } = oklchToRgbUnclamped(oklch);
  return [r, g, b].every((v) => v >= -EPS && v <= 1 + EPS);
}

/**
 * Brings a colour into sRGB by reducing chroma while keeping lightness and
 * hue, which preserves the perceived colour better than channel clipping.
 */
export function gamutMap(oklch: Oklch): Oklch {
  const l = Math.min(1, Math.max(0, oklch.l));
  if (l <= 0 || l >= 1) return { l, c: 0, h: oklch.h };
  if (inSrgbGamut({ ...oklch, l })) return { ...oklch, l };
  let lo = 0;
  let hi = oklch.c;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (inSrgbGamut({ l, c: mid, h: oklch.h })) lo = mid;
    else hi = mid;
  }
  return { l, c: lo, h: oklch.h };
}

export function fromOklch(oklch: Oklch): Color {
  const mapped = gamutMap(oklch);
  const hex = toHex(oklchToRgbUnclamped(mapped));
  // Re-derive from the rounded hex so both forms describe the same colour.
  return { hex, oklch: rgbToOklch(parseHex(hex)) };
}

export function fromHex(value: string): Color {
  const rgb = parseHex(value);
  return { hex: toHex(rgb), oklch: rgbToOklch(rgb) };
}

/** CSS `oklch()` string, rounded for readability. */
export function formatOklch({ l, c, h }: Oklch, alpha?: number): string {
  const L = +(l * 100).toFixed(2);
  const C = +c.toFixed(4);
  const H = +h.toFixed(2);
  return alpha === undefined ? `oklch(${L}% ${C} ${H})` : `oklch(${L}% ${C} ${H} / ${alpha})`;
}

/** WCAG 2.x relative luminance. */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** WCAG 2.x contrast ratio between two colours, 1–21. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
