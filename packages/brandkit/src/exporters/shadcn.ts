import type { Brandkit, SemanticColors, SemanticRole } from "../types.js";
import { type ColorFormat, banner, block, colorValue } from "./shared.js";

export interface ShadcnExportOptions {
  /** Default "oklch", matching current shadcn/ui. */
  format?: ColorFormat;
  /**
   * shadcn's `accent` is the subtle hover colour for menus and ghost buttons.
   * "neutral" (default) keeps it grey like stock shadcn; "brand" tints it
   * with your accent colour.
   */
  accent?: "neutral" | "brand";
  /** Include the `@theme inline` block (Tailwind v4). Default true. */
  themeInline?: boolean;
}

type Mode = "light" | "dark";

function mapping(mode: Mode, accent: "neutral" | "brand"): Record<string, SemanticRole> {
  const card: SemanticRole = mode === "light" ? "background" : "surface";
  return {
    background: "background",
    foreground: "foreground",
    card,
    "card-foreground": "foreground",
    popover: card,
    "popover-foreground": "foreground",
    primary: "primary",
    "primary-foreground": "primary-foreground",
    secondary: "secondary",
    "secondary-foreground": "secondary-foreground",
    muted: "muted",
    "muted-foreground": "muted-foreground",
    accent: accent === "brand" ? "accent-subtle" : "secondary",
    "accent-foreground": accent === "brand" ? "accent-subtle-foreground" : "secondary-foreground",
    destructive: "danger",
    "destructive-foreground": "danger-foreground",
    border: "border",
    input: "input",
    ring: "ring",
    "chart-1": "primary",
    "chart-2": "accent",
    "chart-3": "success",
    "chart-4": "warning",
    "chart-5": "info",
    sidebar: "surface",
    "sidebar-foreground": "surface-foreground",
    "sidebar-primary": "primary",
    "sidebar-primary-foreground": "primary-foreground",
    "sidebar-accent": "secondary",
    "sidebar-accent-foreground": "secondary-foreground",
    "sidebar-border": "border",
    "sidebar-ring": "ring",
    // Extras beyond stock shadcn, handy for alerts and badges.
    success: "success",
    "success-foreground": "success-foreground",
    warning: "warning",
    "warning-foreground": "warning-foreground",
    info: "info",
    "info-foreground": "info-foreground",
  };
}

/**
 * CSS variables for shadcn/ui (React) and shadcn-vue, which share the same
 * variable contract. Replace the `:root`, `.dark` and `@theme inline` blocks
 * in your globals.css (or main.css) with this output.
 */
export function exportShadcn(kit: Brandkit, options: ShadcnExportOptions = {}): string {
  const format = options.format ?? "oklch";
  const accent = options.accent ?? "neutral";
  const vars = (mode: Mode, colors: SemanticColors) =>
    Object.entries(mapping(mode, accent)).map(
      ([name, role]) => `--${name}: ${colorValue(colors[role], format)};`,
    );

  const { typography: t } = kit;
  const root = [
    `--radius: ${kit.radius.lg};`,
    `--brand-font-sans: ${t.families.body};`,
    `--brand-font-heading: ${t.families.heading};`,
    `--brand-font-mono: ${t.families.mono};`,
    ...vars("light", kit.semantic.light),
  ];
  const blocks = [
    banner(kit, "For shadcn/ui and shadcn-vue. Replaces :root, .dark and @theme inline."),
    block(":root", root),
    block(".dark", vars("dark", kit.semantic.dark)),
  ];

  if (options.themeInline ?? true) {
    const names = Object.keys(mapping("light", accent));
    const inline = [
      ...names.map((n) => `--color-${n}: var(--${n});`),
      "--font-sans: var(--brand-font-sans);",
      "--font-heading: var(--brand-font-heading);",
      "--font-mono: var(--brand-font-mono);",
      "--radius-sm: calc(var(--radius) - 4px);",
      "--radius-md: calc(var(--radius) - 2px);",
      "--radius-lg: var(--radius);",
      "--radius-xl: calc(var(--radius) + 4px);",
    ];
    blocks.push(block("@theme inline", inline));
  }
  return `${blocks.join("\n\n")}\n`;
}
