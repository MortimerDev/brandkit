import type { Brandkit } from "../types.js";
import { exportCss } from "./css.js";
import { type ColorFormat, banner, colorValue, scaleEntries, semanticEntries } from "./shared.js";

export interface TailwindExportOptions {
  format?: ColorFormat;
  /** "class" (default) adds a `dark` variant for `.dark` / `[data-theme="dark"]`; "media" follows the OS. */
  darkMode?: "class" | "media";
}

/**
 * Tailwind CSS v4 theme. Import it after Tailwind:
 *
 *   @import "tailwindcss";
 *   @import "./brand.css";
 *
 * Gives utilities such as `bg-primary text-primary-foreground`, `bg-primary-100`,
 * `font-heading`, `rounded-lg` and `shadow-md`, all switching with dark mode.
 */
export function exportTailwind(kit: Brandkit, options: TailwindExportOptions = {}): string {
  const format = options.format ?? "oklch";
  const darkMode = options.darkMode ?? "class";
  const { typography: t } = kit;

  const theme = [
    ...scaleEntries(kit).map(
      ({ scale, step, color }) => `--color-${scale}-${step}: ${colorValue(color, format)};`,
    ),
    `--font-sans: ${t.families.body};`,
    `--font-heading: ${t.families.heading};`,
    `--font-mono: ${t.families.mono};`,
    ...Object.entries(t.scale).flatMap(([k, s]) => [
      `--text-${k}: ${s.size};`,
      `--text-${k}--line-height: ${s.lineHeight};`,
    ]),
    ...Object.entries(kit.radius)
      .filter(([k]) => k !== "none" && k !== "full")
      .map(([k, r]) => `--radius-${k}: ${r};`),
    ...Object.entries(kit.shadow).map(([k, s]) => `--shadow-${k}: ${s};`),
  ];

  const inline = semanticEntries(kit.semantic.light).map(
    ([role]) => `--color-${role}: var(--bk-${role});`,
  );

  // Raw semantic variables (light/dark) come from the plain CSS exporter.
  const raw = exportCss(kit, {
    format,
    darkMode: darkMode === "class" ? "class" : "media",
  })
    .replace(/^\/\*[\s\S]*?\*\/\n\n/, "")
    .trim();

  const parts = [
    banner(kit, 'Import after `@import "tailwindcss";`.'),
    darkMode === "class"
      ? '@custom-variant dark (&:where(.dark, .dark *, [data-theme="dark"], [data-theme="dark"] *));'
      : "",
    `@theme {\n${theme.map((d) => `  ${d}`).join("\n")}\n}`,
    `@theme inline {\n${inline.map((d) => `  ${d}`).join("\n")}\n}`,
    raw,
  ].filter(Boolean);

  return `${parts.join("\n\n")}\n`;
}
