import type { Brandkit, SemanticColors } from "../types.js";
import {
  type ColorFormat,
  banner,
  block,
  colorValue,
  cssKey,
  scaleEntries,
  semanticEntries,
} from "./shared.js";

export interface CssExportOptions {
  /** Custom property prefix. Default "bk" gives `--bk-primary`. */
  prefix?: string;
  /** Default "oklch"; use "hex" for older browser support. */
  format?: ColorFormat;
  /**
   * How dark mode switches on.
   * - "both" (default): follows the OS, overridable with `data-theme`.
   * - "class": only `[data-theme="dark"]` or `.dark`.
   * - "media": only the OS preference.
   * - "none": light tokens only.
   */
  darkMode?: "both" | "class" | "media" | "none";
  /** Wrap output in a cascade layer, e.g. "tokens". */
  layer?: string;
}

export const DARK_SELECTOR = '[data-theme="dark"], .dark';

/** Plain CSS custom properties. Works with any stack, including no framework. */
export function exportCss(kit: Brandkit, options: CssExportOptions = {}): string {
  const prefix = options.prefix ?? "bk";
  const format = options.format ?? "oklch";
  const darkMode = options.darkMode ?? "both";
  const v = (name: string) => `--${prefix}-${name}`;

  const semantic = (colors: SemanticColors) =>
    semanticEntries(colors).map(([role, color]) =>
      color.ref
        ? `${v(role)}: var(${v(`${color.ref.scale}-${color.ref.step}`)});`
        : `${v(role)}: ${colorValue(color, format)};`,
    );

  const { typography: t } = kit;
  const root = [
    ...scaleEntries(kit).map(
      ({ scale, step, color }) => `${v(`${scale}-${step}`)}: ${colorValue(color, format)};`,
    ),
    `${v("font-heading")}: ${t.families.heading};`,
    `${v("font-body")}: ${t.families.body};`,
    `${v("font-mono")}: ${t.families.mono};`,
    ...Object.entries(t.weights).map(([k, w]) => `${v(`weight-${k}`)}: ${w};`),
    ...Object.entries(t.scale).flatMap(([k, s]) => [
      `${v(`text-${k}`)}: ${s.size};`,
      `${v(`leading-${k}`)}: ${s.lineHeight};`,
    ]),
    ...Object.entries(kit.spacing).map(([k, s]) => `${v(`space-${cssKey(k)}`)}: ${s};`),
    ...Object.entries(kit.radius).map(([k, r]) => `${v(`radius-${k}`)}: ${r};`),
    ...Object.entries(kit.shadow).map(([k, s]) => `${v(`shadow-${k}`)}: ${s};`),
    ...semantic(kit.semantic.light),
    "color-scheme: light;",
  ];
  const dark = [...semantic(kit.semantic.dark), "color-scheme: dark;"];

  const indent = options.layer ? "  " : "";
  const blocks = [block(":root", root, indent)];
  if (darkMode === "both" || darkMode === "media") {
    const selector = darkMode === "both" ? ':root:not([data-theme="light"])' : ":root";
    blocks.push(
      `${indent}@media (prefers-color-scheme: dark) {\n${block(selector, dark, `${indent}  `)}\n${indent}}`,
    );
  }
  if (darkMode === "both" || darkMode === "class") {
    blocks.push(block(DARK_SELECTOR, dark, indent));
  }

  const body = blocks.join("\n\n");
  const wrapped = options.layer ? `@layer ${options.layer} {\n${body}\n}` : body;
  return `${banner(kit)}\n\n${wrapped}\n`;
}
