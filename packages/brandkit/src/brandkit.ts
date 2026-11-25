import { type Color, contrastRatio, fromHex, fromOklch, isHex, parseHex } from "./color.js";
import { fontStack, getFontPairing, googleFontsUrl, pickFontPairing } from "./fonts.js";
import {
  type Scale,
  type ScaleStep,
  SCALE_STEPS,
  generateNeutralScale,
  generateScale,
  rotateHue,
} from "./palette.js";
import type {
  AccentStrategy,
  Brandkit,
  BrandkitInput,
  ContrastCheck,
  Personality,
  Roundness,
  ScaleName,
  SemanticColor,
  SemanticColors,
  SemanticRole,
  TypeScaleName,
  Typography,
} from "./types.js";

const TEXT_CONTRAST = 4.5;
const UI_CONTRAST = 3;
/** Minimum fill-to-page contrast so a button never disappears into the background. */
const FILL_SEPARATION = 1.4;

/** Starting colour for each personality when no primary is supplied. */
export const PERSONALITY_COLORS: Record<Personality, string> = {
  professional: "#2563eb",
  friendly: "#0d9488",
  playful: "#db2777",
  calm: "#0f766e",
  bold: "#e11d48",
  technical: "#4f46e5",
  warm: "#ea580c",
  luxurious: "#6d28d9",
};

interface PersonalityTraits {
  roundness: Roundness;
  /** Modular type-scale ratio. */
  typeRatio: number;
  /** Chroma of the tinted neutrals (0 = pure grey). */
  neutralTint: number;
  accentStrategy: AccentStrategy;
  /** Multiplier for the chroma of a derived second colour. */
  accentChroma: number;
}

/**
 * What each personality changes. Every row differs from the others in at
 * least two visible ways, so picking a personality always shows up in the
 * kit even when the user supplies their own colour. Fonts are chosen
 * separately in fonts.ts.
 */
export const PERSONALITY_TRAITS: Record<Personality, PersonalityTraits> = {
  professional: {
    roundness: "soft",
    typeRatio: 1.2,
    neutralTint: 0.006,
    accentStrategy: "analogous",
    accentChroma: 0.9,
  },
  friendly: {
    roundness: "round",
    typeRatio: 1.25,
    neutralTint: 0.012,
    accentStrategy: "triadic",
    accentChroma: 1,
  },
  playful: {
    roundness: "round",
    typeRatio: 1.3,
    neutralTint: 0.014,
    accentStrategy: "triadic",
    accentChroma: 1.25,
  },
  calm: {
    roundness: "round",
    typeRatio: 1.15,
    neutralTint: 0.018,
    accentStrategy: "analogous",
    accentChroma: 0.6,
  },
  bold: {
    roundness: "sharp",
    typeRatio: 1.414,
    neutralTint: 0.004,
    accentStrategy: "complementary",
    accentChroma: 1.25,
  },
  technical: {
    roundness: "sharp",
    typeRatio: 1.2,
    neutralTint: 0.004,
    accentStrategy: "split",
    accentChroma: 1,
  },
  warm: {
    roundness: "round",
    typeRatio: 1.25,
    neutralTint: 0.02,
    accentStrategy: "analogous",
    accentChroma: 0.9,
  },
  luxurious: {
    roundness: "sharp",
    typeRatio: 1.333,
    neutralTint: 0.008,
    accentStrategy: "complementary",
    accentChroma: 0.75,
  },
};

/**
 * Weights for personalities in order of importance. The first counts most,
 * but the second and third together can outvote it.
 */
const WEIGHTS = [2, 1.5, 1];
function weights(personality: Personality[]): [Personality, number][] {
  return personality.map((p, i) => [p, WEIGHTS[i] ?? 1]);
}

/** Weighted average of a numeric trait across all chosen personalities. */
function blend(personality: Personality[], pick: (t: PersonalityTraits) => number): number {
  let sum = 0;
  let total = 0;
  for (const [p, w] of weights(personality)) {
    sum += pick(PERSONALITY_TRAITS[p]) * w;
    total += w;
  }
  return sum / total;
}

/** Weighted vote for a categorical trait; ties go to the most important personality. */
function vote<T extends string>(personality: Personality[], pick: (t: PersonalityTraits) => T): T {
  const tally = new Map<T, number>();
  for (const [p, w] of weights(personality)) {
    const value = pick(PERSONALITY_TRAITS[p]);
    tally.set(value, (tally.get(value) ?? 0) + w);
  }
  let best = pick(PERSONALITY_TRAITS[personality[0] as Personality]);
  for (const [value, score] of tally) if (score > (tally.get(best) ?? 0)) best = value;
  return best;
}

const ACCENT_ROTATION: Record<AccentStrategy, number> = {
  analogous: 40,
  complementary: 180,
  triadic: 120,
  split: 150,
};

/** Status colours are fixed hues so their meaning stays recognisable. */
const STATUS_HUES = { success: 150, warning: 75, danger: 27, info: 245 } as const;

const RADIUS: Record<Roundness, Brandkit["radius"]> = {
  sharp: { none: "0", sm: "0.125rem", md: "0.25rem", lg: "0.375rem", xl: "0.5rem", full: "9999px" },
  soft: {
    none: "0",
    sm: "0.25rem",
    md: "0.375rem",
    lg: "0.625rem",
    xl: "0.875rem",
    full: "9999px",
  },
  round: { none: "0", sm: "0.375rem", md: "0.625rem", lg: "1rem", xl: "1.5rem", full: "9999px" },
};

const WHITE: SemanticColor = { ...fromHex("#ffffff"), ref: null };

function ref(scales: Record<ScaleName, Scale>, scale: ScaleName, step: ScaleStep): SemanticColor {
  return { ...scales[scale][step], ref: { scale, step } };
}

/** Steps to try, starting at `start` and moving darker (+1) or lighter (-1) first. */
function stepsFrom(start: ScaleStep, direction: 1 | -1): ScaleStep[] {
  const i = SCALE_STEPS.indexOf(start);
  const first = direction === 1 ? SCALE_STEPS.slice(i) : SCALE_STEPS.slice(0, i + 1).reverse();
  const rest = direction === 1 ? SCALE_STEPS.slice(0, i).reverse() : SCALE_STEPS.slice(i + 1);
  return [...first, ...rest];
}

interface Resolver {
  scales: Record<ScaleName, Scale>;
  /** First step that reaches `min` contrast against every background. */
  onBackgrounds(
    scale: ScaleName,
    order: ScaleStep[],
    backgrounds: Color[],
    min?: number,
  ): SemanticColor;
  /** First fill step where one of the foregrounds reaches text contrast. */
  fill(
    scale: ScaleName,
    order: ScaleStep[],
    foregrounds: SemanticColor[],
    page: Color,
  ): { fill: SemanticColor; foreground: SemanticColor; step: ScaleStep };
}

function resolver(scales: Record<ScaleName, Scale>): Resolver {
  return {
    scales,
    onBackgrounds(scale, order, backgrounds, min = TEXT_CONTRAST) {
      let best: { step: ScaleStep; ratio: number } | null = null;
      for (const step of order) {
        const hex = scales[scale][step].hex;
        const ratio = Math.min(...backgrounds.map((bg) => contrastRatio(hex, bg.hex)));
        if (ratio >= min) return ref(scales, scale, step);
        if (!best || ratio > best.ratio) best = { step, ratio };
      }
      return ref(scales, scale, (best as { step: ScaleStep }).step);
    },
    fill(scale, order, foregrounds, page) {
      let best: { step: ScaleStep; fg: SemanticColor; ratio: number } | null = null;
      for (const step of order) {
        const hex = scales[scale][step].hex;
        if (contrastRatio(hex, page.hex) < FILL_SEPARATION) continue;
        for (const fg of foregrounds) {
          const ratio = contrastRatio(hex, fg.hex);
          if (ratio >= TEXT_CONTRAST)
            return { fill: ref(scales, scale, step), foreground: fg, step };
          if (!best || ratio > best.ratio) best = { step, fg, ratio };
        }
      }
      const b = best ?? { step: order[0] as ScaleStep, fg: foregrounds[0] as SemanticColor };
      return { fill: ref(scales, scale, b.step), foreground: b.fg, step: b.step };
    },
  };
}

function neighbour(step: ScaleStep, direction: 1 | -1): ScaleStep {
  const i = SCALE_STEPS.indexOf(step) + direction;
  return SCALE_STEPS[Math.min(SCALE_STEPS.length - 1, Math.max(0, i))] as ScaleStep;
}

function buildSemantic(
  r: Resolver,
  mode: "light" | "dark",
  primaryBaseStep: ScaleStep | null,
): SemanticColors {
  const { scales } = r;
  const n = (step: ScaleStep) => ref(scales, "neutral", step);
  const light = mode === "light";

  const background = light ? WHITE : n(950);
  const foreground = light ? n(950) : n(50);
  const surface = light ? n(50) : n(900);
  const muted = light ? n(100) : n(800);
  const darkText = n(950);
  const lightText = light ? WHITE : n(50);
  const textBgs = [background, surface];

  const fillOrder = (preferred: ScaleStep) =>
    light ? stepsFrom(preferred, 1) : stepsFrom(preferred, -1);
  const textOrder = light ? stepsFrom(500, 1) : stepsFrom(400, -1);

  // Prefer the user's exact colour for buttons when it passes contrast.
  const primaryStart = light
    ? (primaryBaseStep ?? 600)
    : primaryBaseStep !== null && primaryBaseStep <= 400
      ? primaryBaseStep
      : 400;
  const primary = r.fill("primary", fillOrder(primaryStart), [lightText, darkText], background);
  const accent = r.fill("accent", fillOrder(light ? 600 : 400), [lightText, darkText], background);
  const hoverDirection: 1 | -1 = light ? 1 : -1;

  const semantic: Partial<SemanticColors> = {
    background,
    foreground,
    surface,
    "surface-foreground": foreground,
    muted,
    "muted-foreground": r.onBackgrounds("neutral", light ? stepsFrom(500, 1) : stepsFrom(400, -1), [
      background,
      surface,
      muted,
    ]),
    border: light ? n(200) : n(800),
    input: r.onBackgrounds(
      "neutral",
      light ? stepsFrom(400, 1) : stepsFrom(600, -1),
      [background],
      UI_CONTRAST,
    ),
    ring: r.onBackgrounds("primary", textOrder, [background], UI_CONTRAST),
    link: r.onBackgrounds("primary", textOrder, textBgs),
    primary: primary.fill,
    "primary-foreground": primary.foreground,
    "primary-hover": ref(scales, "primary", neighbour(primary.step, hoverDirection)),
    secondary: light ? n(100) : n(800),
    "secondary-foreground": light ? n(900) : n(50),
    accent: accent.fill,
    "accent-foreground": accent.foreground,
  };

  const subtleStep: ScaleStep = light ? 100 : 900;
  const subtleTextOrder = light ? stepsFrom(700, 1) : stepsFrom(200, -1);
  const withSubtle = (name: "accent" | "success" | "warning" | "danger" | "info") => {
    const subtle = ref(scales, name, subtleStep);
    semantic[`${name}-subtle`] = subtle;
    semantic[`${name}-subtle-foreground`] = r.onBackgrounds(name, subtleTextOrder, [subtle]);
  };

  withSubtle("accent");
  for (const status of ["success", "warning", "danger", "info"] as const) {
    const { fill, foreground: fg } = r.fill(
      status,
      fillOrder(light ? 600 : 400),
      [lightText, darkText],
      background,
    );
    semantic[status] = fill;
    semantic[`${status}-foreground`] = fg;
    withSubtle(status);
  }

  return semantic as SemanticColors;
}

/** Text pairs checked against WCAG 2 AA for normal text. */
const CONTRAST_PAIRS: [SemanticRole, SemanticRole, number][] = [
  ["foreground", "background", TEXT_CONTRAST],
  ["surface-foreground", "surface", TEXT_CONTRAST],
  ["muted-foreground", "background", TEXT_CONTRAST],
  ["muted-foreground", "muted", TEXT_CONTRAST],
  ["link", "background", TEXT_CONTRAST],
  ["primary-foreground", "primary", TEXT_CONTRAST],
  ["secondary-foreground", "secondary", TEXT_CONTRAST],
  ["accent-foreground", "accent", TEXT_CONTRAST],
  ["accent-subtle-foreground", "accent-subtle", TEXT_CONTRAST],
  ["success-foreground", "success", TEXT_CONTRAST],
  ["success-subtle-foreground", "success-subtle", TEXT_CONTRAST],
  ["warning-foreground", "warning", TEXT_CONTRAST],
  ["warning-subtle-foreground", "warning-subtle", TEXT_CONTRAST],
  ["danger-foreground", "danger", TEXT_CONTRAST],
  ["danger-subtle-foreground", "danger-subtle", TEXT_CONTRAST],
  ["info-foreground", "info", TEXT_CONTRAST],
  ["info-subtle-foreground", "info-subtle", TEXT_CONTRAST],
  ["input", "background", UI_CONTRAST],
  ["ring", "background", UI_CONTRAST],
];

export function checkContrast(semantic: Brandkit["semantic"]): ContrastCheck[] {
  const checks: ContrastCheck[] = [];
  for (const mode of ["light", "dark"] as const) {
    for (const [fg, bg, required] of CONTRAST_PAIRS) {
      const ratio = contrastRatio(semantic[mode][fg].hex, semantic[mode][bg].hex);
      checks.push({
        foreground: fg,
        background: bg,
        mode,
        ratio: Math.round(ratio * 100) / 100,
        required,
        aa: ratio >= required,
        aaa: ratio >= (required === TEXT_CONTRAST ? 7 : 4.5),
      });
    }
  }
  return checks;
}

const TYPE_STEPS: [TypeScaleName, number][] = [
  ["xs", -2],
  ["sm", -1],
  ["base", 0],
  ["lg", 1],
  ["xl", 2],
  ["2xl", 3],
  ["3xl", 4],
  ["4xl", 5],
  ["5xl", 6],
];

function buildTypography(input: BrandkitInput, personality: Personality[]): Typography {
  const pairing = input.fontPairing
    ? getFontPairing(input.fontPairing)
    : pickFontPairing(personality);
  const ratio = Math.round(blend(personality, (t) => t.typeRatio) * 1000) / 1000;
  const scale = {} as Typography["scale"];
  for (const [name, power] of TYPE_STEPS) {
    const rem = Math.round(ratio ** power * 1000) / 1000;
    const lineHeight = rem <= 1.25 ? "1.5" : rem <= 2 ? "1.3" : "1.15";
    scale[name] = { size: `${rem}rem`, lineHeight };
  }
  return {
    pairing,
    families: {
      heading: fontStack(pairing.heading),
      body: fontStack(pairing.body),
      mono: fontStack(pairing.mono),
    },
    googleFontsUrl: googleFontsUrl(pairing),
    ratio,
    scale,
    weights: {
      regular: 400,
      semibold: 600,
      bold: 700,
      heading: Math.max(...pairing.heading.weights),
    },
  };
}

const SPACING_KEYS = [0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24];

function buildSpacing(): Record<string, string> {
  const spacing: Record<string, string> = {};
  for (const key of SPACING_KEYS) spacing[String(key)] = key === 0 ? "0" : `${key * 0.25}rem`;
  return spacing;
}

function buildShadows(neutral: Scale): Brandkit["shadow"] {
  const { r, g, b } = parseHex(neutral[950].hex);
  const rgb = (a: number) =>
    `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)} / ${a})`;
  return {
    sm: `0 1px 2px 0 ${rgb(0.06)}`,
    md: `0 4px 8px -2px ${rgb(0.1)}, 0 2px 4px -2px ${rgb(0.06)}`,
    lg: `0 12px 24px -6px ${rgb(0.14)}, 0 4px 8px -4px ${rgb(0.08)}`,
  };
}

function assertHex(label: string, value: string | undefined): void {
  if (value !== undefined && !isHex(value)) {
    throw new Error(`${label} must be a hex colour like #2563eb, received "${value}".`);
  }
}

/**
 * Generates a complete, contrast-checked design system from brand answers.
 * The result is plain JSON and deterministic for the same input.
 */
export function createBrandkit(input: BrandkitInput): Brandkit {
  if (!input.name?.trim()) throw new Error("A brand name is required.");
  assertHex("primary", input.primary);
  assertHex("accent", input.accent);

  const personality: Personality[] = input.personality?.length
    ? input.personality
    : ["professional"];
  const lead = personality[0] as Personality;
  const accentStrategy = input.accentStrategy ?? PERSONALITY_TRAITS[lead].accentStrategy;
  const roundness = input.roundness ?? vote(personality, (t) => t.roundness);

  const primaryColor = fromHex(input.primary ?? PERSONALITY_COLORS[lead]);
  const primary = generateScale(primaryColor, { keepBase: input.primary !== undefined });

  const accentColor = input.accent
    ? fromHex(input.accent)
    : rotateHue(
        primaryColor,
        ACCENT_ROTATION[accentStrategy],
        Math.max(primaryColor.oklch.c, 0.1) * blend(personality, (t) => t.accentChroma),
      );
  const accent = generateScale(accentColor, { keepBase: input.accent !== undefined });

  const tint = Math.min(
    input.neutralTint ?? blend(personality, (t) => t.neutralTint),
    0.03,
    primaryColor.oklch.c,
  );
  const status = (h: number) =>
    generateScale(fromOklch({ l: 0.62, c: 0.17, h }), { keepBase: false }).scale;

  const scales: Record<ScaleName, Scale> = {
    primary: primary.scale,
    accent: accent.scale,
    neutral: generateNeutralScale(primaryColor.oklch.h, tint),
    success: status(STATUS_HUES.success),
    warning: status(STATUS_HUES.warning),
    danger: status(STATUS_HUES.danger),
    info: status(STATUS_HUES.info),
  };

  const r = resolver(scales);
  const semantic = {
    light: buildSemantic(r, "light", primary.baseStep),
    dark: buildSemantic(r, "dark", primary.baseStep),
  };

  return {
    version: 1,
    meta: {
      name: input.name.trim(),
      ...(input.description ? { description: input.description } : {}),
      personality,
      roundness,
      accentStrategy,
      primaryBaseStep: primary.baseStep,
      sources: {
        primary: input.primary ? "input" : "personality",
        accent: input.accent ? "input" : "derived",
        roundness: input.roundness ? "input" : "personality",
        fontPairing: input.fontPairing ? "input" : "personality",
      },
    },
    scales,
    semantic,
    typography: buildTypography(input, personality),
    spacing: buildSpacing(),
    radius: RADIUS[roundness],
    shadow: buildShadows(scales.neutral),
    contrast: checkContrast(semantic),
  };
}
