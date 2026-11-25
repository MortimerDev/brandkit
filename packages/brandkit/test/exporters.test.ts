import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { compile } from "@tailwindcss/node";
import { transform } from "lightningcss";
import * as sass from "sass";
import { describe, expect, it } from "vitest";
import { createBrandkit, SEMANTIC_ROLES } from "../src/index.js";
import { exportBootstrap } from "../src/exporters/bootstrap.js";
import { exportCss } from "../src/exporters/css.js";
import { type DesignLibrary, exportDesignMd } from "../src/exporters/design-md.js";
import { exportDtcg, exportDtcgJson } from "../src/exporters/dtcg.js";
import { exportShadcn } from "../src/exporters/shadcn.js";
import { exportTailwind } from "../src/exporters/tailwind.js";
import { exportVuetify, exportVuetifyModule } from "../src/exporters/vuetify.js";

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const kit = createBrandkit({
  name: "Acme",
  description: "Tools for makers.",
  primary: "#2563eb",
  personality: ["professional", "friendly"],
});

/** Parses CSS strictly; throws on syntax errors. */
function parseCss(code: string) {
  return transform({ filename: "t.css", code: Buffer.from(code), errorRecovery: false });
}

async function tailwind(css: string, candidates: string[]) {
  const compiler = await compile(`@import "tailwindcss";\n${css}`, {
    base: pkgDir,
    onDependency: () => {},
  });
  return compiler.build(candidates);
}

describe("css exporter", () => {
  it("emits valid CSS with every semantic role for light and dark", () => {
    const css = exportCss(kit);
    expect(() => parseCss(css)).not.toThrow();
    for (const role of SEMANTIC_ROLES) expect(css).toContain(`--bk-${role}:`);
    expect(css).toContain("@media (prefers-color-scheme: dark)");
    expect(css).toContain('[data-theme="dark"], .dark');
  });

  it("aliases semantic tokens to scale tokens", () => {
    expect(exportCss(kit)).toContain("--bk-primary: var(--bk-primary-600);");
  });

  it("supports hex, a custom prefix, a layer and no dark mode", () => {
    const css = exportCss(kit, {
      format: "hex",
      prefix: "acme",
      layer: "tokens",
      darkMode: "none",
    });
    expect(() => parseCss(css)).not.toThrow();
    expect(css).toContain("@layer tokens {");
    expect(css).toContain("--acme-primary-600: #2563eb;");
    expect(css).not.toContain("oklch(");
    expect(css).not.toContain("prefers-color-scheme");
  });
});

describe("tailwind v4 exporter", () => {
  it("compiles with Tailwind and generates brand utilities", async () => {
    const out = await tailwind(exportTailwind(kit), [
      "bg-primary",
      "text-primary-foreground",
      "bg-primary-100",
      "text-muted-foreground",
      "border-border",
      "font-heading",
      "rounded-lg",
      "shadow-md",
      "dark:bg-surface",
    ]);
    expect(out).toContain(".bg-primary {");
    expect(out).toContain("background-color: var(--bk-primary)");
    expect(out).toContain(".font-heading");
    expect(out).toMatch(/\.dark\\:bg-surface/);
    expect(out).toContain("--bk-primary: var(--bk-primary-600)");
    expect(out).toContain(kit.typography.pairing.heading.name);
  });

  it("compiles in media dark mode without the custom variant", async () => {
    const css = exportTailwind(kit, { darkMode: "media" });
    expect(css).not.toContain("@custom-variant");
    const out = await tailwind(css, ["bg-background"]);
    expect(out).toContain("prefers-color-scheme: dark");
  });
});

describe("shadcn exporter", () => {
  it("defines the shadcn variable contract and compiles with Tailwind", async () => {
    const css = exportShadcn(kit);
    for (const name of [
      "background",
      "card",
      "popover",
      "primary",
      "muted",
      "accent",
      "destructive",
      "border",
      "input",
      "ring",
      "chart-1",
      "sidebar",
    ]) {
      expect(css).toMatch(new RegExp(`--${name}: oklch\\(`));
    }
    expect(css).toContain(".dark {");
    const out = await tailwind(css, [
      "bg-primary",
      "bg-card",
      "text-destructive",
      "bg-success",
      "rounded-md",
      "font-heading",
    ]);
    expect(out).toContain(".bg-card");
    expect(out).toContain(".bg-success");
    expect(out).toContain("calc(var(--radius) - 2px)");
  });

  it("can tint shadcn accent with the brand accent", () => {
    const neutral = exportShadcn(kit);
    const brand = exportShadcn(kit, { accent: "brand", format: "hex" });
    expect(brand).toContain(`--accent: ${kit.semantic.light["accent-subtle"].hex};`);
    expect(neutral).not.toEqual(brand);
  });
});

describe("bootstrap exporter", () => {
  it("compiles with Bootstrap 5.3 and themes buttons and dark mode", () => {
    const scss = `${exportBootstrap(kit)}\n@import "bootstrap/scss/bootstrap";`;
    const { css } = sass.compileString(scss, {
      loadPaths: [join(pkgDir, "node_modules")],
      quietDeps: true,
      silenceDeprecations: [
        "import",
        "global-builtin",
        "color-functions",
        "mixed-decls",
        "legacy-js-api",
      ],
      logger: sass.Logger.silent,
    });
    expect(css).toContain(`--bs-primary: ${kit.semantic.light.primary.hex}`);
    expect(css).toMatch(
      new RegExp(`\\.btn-primary \\{[^}]*--bs-btn-bg: ${kit.semantic.light.primary.hex}`),
    );
    expect(css).toContain("[data-bs-theme=dark]");
    expect(css).toContain(`--bs-body-bg: ${kit.semantic.dark.background.hex}`);
    expect(css).toContain(kit.typography.pairing.body.name);
  });
});

describe("dtcg exporter", () => {
  it("aliases semantic colours to scale tokens that exist", () => {
    const tokens = exportDtcg(kit) as Record<string, any>;
    const alias = tokens.semantic.light.primary.$value as string;
    expect(alias).toBe("{color.primary.600}");
    const [, scale, step] = alias.slice(1, -1).split(".");
    expect(tokens.color[scale!][step!].$value).toBe("#2563eb");
    expect(tokens.semantic.light.background.$value).toBe("#ffffff");
  });

  it("emits typed tokens and structured shadows", () => {
    const tokens = exportDtcg(kit) as Record<string, any>;
    expect(tokens.font.family.heading.$type).toBe("fontFamily");
    expect(Array.isArray(tokens.font.family.heading.$value)).toBe(true);
    expect(tokens.space["4"]).toEqual({ $type: "dimension", $value: "1rem" });
    expect(tokens.shadow.md.$value).toHaveLength(2);
    expect(tokens.shadow.md.$value[0]).toMatchObject({ offsetX: "0", offsetY: "4px", blur: "8px" });
    expect(() => JSON.parse(exportDtcgJson(kit))).not.toThrow();
  });
});

describe("vuetify exporter", () => {
  it("returns light and dark themes with hex colours", () => {
    const theme = exportVuetify(kit);
    expect(theme.defaultTheme).toBe("light");
    expect(theme.themes.dark.dark).toBe(true);
    for (const mode of ["light", "dark"] as const) {
      for (const value of Object.values(theme.themes[mode].colors))
        expect(value).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(theme.themes.light.colors.primary).toBe("#2563eb");
  });

  it("writes an importable module", async () => {
    const source = exportVuetifyModule(kit);
    const mod = await import(
      `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
    );
    expect(mod.default).toEqual(exportVuetify(kit));
  });
});

describe("DESIGN.md exporter", () => {
  const libraries: DesignLibrary[] = [
    "css",
    "tailwind",
    "shadcn",
    "shadcn-vue",
    "bootstrap",
    "vuetify",
  ];

  it.each(libraries)("writes library-specific guidance for %s", (library) => {
    const md = exportDesignMd(kit, { library });
    expect(md).toMatch(/^# Acme design system/);
    expect(md).toContain("Tools for makers.");
    expect(md).toContain("## Semantic colours");
    expect(md).toContain("meets WCAG 2.2 AA");
    expect(md).toContain(kit.typography.googleFontsUrl);
  });

  it("points Tailwind users at semantic utilities", () => {
    expect(exportDesignMd(kit, { library: "tailwind" })).toContain(
      "bg-primary text-primary-foreground",
    );
  });
});
