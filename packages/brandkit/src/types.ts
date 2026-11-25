import type { Color } from "./color.js";
import type { FontPairing } from "./fonts.js";
import type { Scale, ScaleStep } from "./palette.js";

export const PERSONALITIES = [
  "professional",
  "friendly",
  "playful",
  "calm",
  "bold",
  "technical",
  "warm",
  "luxurious",
] as const;
export type Personality = (typeof PERSONALITIES)[number];

export type Roundness = "sharp" | "soft" | "round";
export type AccentStrategy = "analogous" | "complementary" | "triadic" | "split";

/** Everything needed to generate a brand kit. Only `name` is required. */
export interface BrandkitInput {
  name: string;
  description?: string;
  /** Main brand colour as hex. Derived from personality when omitted. */
  primary?: string;
  /** Accent colour as hex. Derived from the primary when omitted. */
  accent?: string;
  accentStrategy?: AccentStrategy;
  /** Most important first. */
  personality?: Personality[];
  roundness?: Roundness;
  /** Font pairing id from FONT_PAIRINGS. Chosen from personality when omitted. */
  fontPairing?: string;
  /** Neutral tint chroma, 0 (pure grey) to ~0.03. */
  neutralTint?: number;
}

export type ScaleName =
  "primary" | "accent" | "neutral" | "success" | "warning" | "danger" | "info";

/** Semantic colour roles, used by every exporter. */
export const SEMANTIC_ROLES = [
  "background",
  "foreground",
  "surface",
  "surface-foreground",
  "muted",
  "muted-foreground",
  "border",
  "input",
  "ring",
  "link",
  "primary",
  "primary-foreground",
  "primary-hover",
  "secondary",
  "secondary-foreground",
  "accent",
  "accent-foreground",
  "accent-subtle",
  "accent-subtle-foreground",
  "success",
  "success-foreground",
  "success-subtle",
  "success-subtle-foreground",
  "warning",
  "warning-foreground",
  "warning-subtle",
  "warning-subtle-foreground",
  "danger",
  "danger-foreground",
  "danger-subtle",
  "danger-subtle-foreground",
  "info",
  "info-foreground",
  "info-subtle",
  "info-subtle-foreground",
] as const;
export type SemanticRole = (typeof SEMANTIC_ROLES)[number];

/** A semantic colour plus where it came from, so exporters can alias it. */
export interface SemanticColor extends Color {
  /** e.g. { scale: "primary", step: 600 }, or null for white/black. */
  ref: { scale: ScaleName; step: ScaleStep } | null;
}

export type SemanticColors = Record<SemanticRole, SemanticColor>;

export interface TypeStep {
  size: string;
  lineHeight: string;
}

export type TypeScaleName = "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";

export interface Typography {
  pairing: FontPairing;
  families: { heading: string; body: string; mono: string };
  googleFontsUrl: string;
  ratio: number;
  scale: Record<TypeScaleName, TypeStep>;
  weights: { regular: number; semibold: number; bold: number; heading: number };
}

export interface ContrastCheck {
  foreground: SemanticRole;
  background: SemanticRole;
  mode: "light" | "dark";
  ratio: number;
  /** Required ratio for this pair (4.5 for text). */
  required: number;
  aa: boolean;
  aaa: boolean;
}

export interface Brandkit {
  /** Format version of this object, bumped on breaking changes. */
  version: 1;
  meta: {
    name: string;
    description?: string;
    personality: Personality[];
    roundness: Roundness;
    accentStrategy: AccentStrategy;
    /** Step holding the exact colour the user supplied, if any. */
    primaryBaseStep: ScaleStep | null;
    /** Where each choice came from: the user's input or the personality. */
    sources: {
      primary: "input" | "personality";
      accent: "input" | "derived";
      roundness: "input" | "personality";
      fontPairing: "input" | "personality";
    };
  };
  scales: Record<ScaleName, Scale>;
  semantic: { light: SemanticColors; dark: SemanticColors };
  typography: Typography;
  spacing: Record<string, string>;
  radius: Record<"none" | "sm" | "md" | "lg" | "xl" | "full", string>;
  shadow: Record<"sm" | "md" | "lg", string>;
  contrast: ContrastCheck[];
}
