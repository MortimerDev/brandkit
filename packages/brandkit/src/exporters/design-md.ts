import { SCALE_STEPS } from "../palette.js";
import type { Brandkit, SemanticRole } from "../types.js";
import { SCALE_NAMES } from "./shared.js";

export type DesignLibrary = "css" | "tailwind" | "shadcn" | "shadcn-vue" | "bootstrap" | "vuetify";

export interface DesignMdOptions {
  /** UI library the project uses. Default "css" (no library). */
  library?: DesignLibrary;
}

const ROLE_GUIDE: [SemanticRole, string][] = [
  ["background", "Page background."],
  ["foreground", "Default text."],
  ["surface", "Cards, panels and raised areas."],
  ["muted", "Subtle backgrounds such as table stripes or disabled fields."],
  ["muted-foreground", "Secondary text: captions, hints, metadata."],
  ["border", "Dividers and card outlines."],
  ["input", "Form control borders (meets 3:1 against the page)."],
  ["ring", "Focus outlines. Never remove focus styles."],
  ["link", "Inline links in body text."],
  ["primary", "The main call to action. One primary button per view."],
  ["secondary", "Secondary buttons and less important actions."],
  ["accent", "Highlights, badges and illustrations. Not for body text."],
  ["success", "Confirmation and completed states."],
  ["warning", "Caution states that need attention."],
  ["danger", "Errors and destructive actions."],
  ["info", "Neutral information and tips."],
];

const LIBRARY_GUIDE: Record<DesignLibrary, string[]> = {
  css: [
    'Tokens are CSS custom properties prefixed `--bk-` in `brand.css`; dark mode follows the OS and `data-theme="dark"`.',
    "Use semantic tokens in components: `background: var(--bk-primary); color: var(--bk-primary-foreground);`.",
    "Base styles and simple components come from `@mortimerdev/brandkit-css` (layers: reset, tokens, base, components).",
    "Classes available: `.bk-button`, `.bk-button--secondary`, `.bk-button--ghost`, `.bk-input`, `.bk-card`, `.bk-nav`, `.bk-badge`, `.bk-alert`.",
  ],
  tailwind: [
    'Theme lives in `brand.css`, imported after `@import "tailwindcss";` (Tailwind v4).',
    "Use semantic utilities: `bg-primary text-primary-foreground`, `bg-surface`, `text-muted-foreground`, `border-border`.",
    "Use scale utilities (`bg-primary-100`) only for decoration; prefer semantic names for anything interactive.",
    "Headings use `font-heading`; body text uses the default `font-sans`.",
    'Dark mode: add `class="dark"` or `data-theme="dark"` on `<html>`, and use the `dark:` variant only when a semantic token does not already switch.',
  ],
  shadcn: [
    "Variables replace the `:root`, `.dark` and `@theme inline` blocks in `globals.css` (shadcn/ui, Tailwind v4).",
    "Use shadcn components as-is; they read `--primary`, `--muted`, `--destructive` and friends.",
    "Extra tokens `success`, `warning` and `info` are available as `bg-success text-success-foreground` etc.",
    "Headings use `font-heading`.",
  ],
  "shadcn-vue": [
    "Variables replace the `:root`, `.dark` and `@theme inline` blocks in `main.css` (shadcn-vue, Tailwind v4).",
    "Use shadcn-vue components as-is; they read `--primary`, `--muted`, `--destructive` and friends.",
    "Extra tokens `success`, `warning` and `info` are available as `bg-success text-success-foreground` etc.",
    "Headings use `font-heading`.",
  ],
  bootstrap: [
    "Sass variables live in `_brand.scss`, imported before `bootstrap/scss/bootstrap` (Bootstrap 5.3).",
    "Use Bootstrap's theme classes: `btn btn-primary`, `text-bg-success`, `alert alert-danger`.",
    'Dark mode uses `data-bs-theme="dark"` on `<html>`.',
    "Do not override colours with inline styles; change `_brand.scss` instead.",
  ],
  vuetify: [
    "Theme is in `brand-theme.js`, passed to `createVuetify({ theme: brandTheme })` (Vuetify 3).",
    'Use theme colours on components: `<v-btn color="primary">`, `color="error"`, `color="success"`.',
    "Switch modes with `theme.global.name.value = 'dark'` (or `theme.change('dark')` in newer releases).",
    "Fonts: set `$body-font-family` in Vuetify Sass settings to the body stack below.",
  ],
};

function table(rows: string[][]): string {
  const [head, ...body] = rows as [string[], ...string[][]];
  return [
    `| ${head.join(" | ")} |`,
    `| ${head.map(() => "---").join(" | ")} |`,
    ...body.map((r) => `| ${r.join(" | ")} |`),
  ].join("\n");
}

/**
 * DESIGN.md for AI coding assistants (Claude, Cursor, Copilot) and humans:
 * what the tokens are, when to use each, and how they plug into the library.
 */
export function exportDesignMd(kit: Brandkit, options: DesignMdOptions = {}): string {
  const library = options.library ?? "css";
  const { meta, semantic, typography: t } = kit;

  const roles = table([
    ["Token", "Light", "Dark", "Use for"],
    ...ROLE_GUIDE.map(([role, use]) => [
      `\`${role}\``,
      semantic.light[role].hex,
      semantic.dark[role].hex,
      use,
    ]),
  ]);

  const scales = table([
    ["Scale", ...SCALE_STEPS.map(String)],
    ...SCALE_NAMES.map((name) => [name, ...SCALE_STEPS.map((s) => kit.scales[name][s].hex)]),
  ]);

  const type = table([
    ["Step", "Size", "Line height"],
    ...Object.entries(t.scale).map(([k, s]) => [k, s.size, s.lineHeight]),
  ]);

  const failing = kit.contrast.filter((c) => !c.aa);
  const contrastNote = failing.length
    ? `Warning: ${failing.length} pair(s) are below WCAG AA: ${failing
        .map((c) => `${c.foreground} on ${c.background} (${c.mode}, ${c.ratio}:1)`)
        .join(", ")}.`
    : "Every text/background pair in this system meets WCAG 2.2 AA (4.5:1), and inputs and focus rings meet 3:1. Keep it that way: only put `*-foreground` text on its matching background.";

  return `# ${meta.name} design system

${meta.description ? `${meta.description}\n\n` : ""}Personality: ${meta.personality.join(", ")}. Corners: ${meta.roundness}.

This file describes the visual language for this project. Follow it when writing UI code. Generated by [@mortimerdev/brandkit](https://github.com/MortimerDev/brandkit).

## Rules

- Use semantic tokens (\`primary\`, \`surface\`, \`muted-foreground\`), never raw hex values in components.
- Pair every background token with its \`-foreground\` token for text and icons.
- Support light and dark mode by using tokens; do not hard-code colours per mode.
- Keep visible focus styles using \`ring\`.
- Use the type scale and spacing scale below; avoid one-off sizes.
- ${contrastNote}

## Using it with ${library === "css" ? "plain CSS (no library)" : library}

${LIBRARY_GUIDE[library].map((l) => `- ${l}`).join("\n")}

## Semantic colours

${roles}

## Colour scales

${scales}

## Typography

- Headings: \`${t.families.heading}\` (weight ${t.weights.heading})
- Body: \`${t.families.body}\`
- Code: \`${t.families.mono}\`
- Load fonts: ${t.googleFontsUrl}
- All fonts are free under the SIL Open Font License.

${type}

## Shape and depth

- Radius: ${Object.entries(kit.radius)
    .map(([k, v]) => `${k} ${v}`)
    .join(", ")}
- Spacing unit: 0.25rem (spacing key \`4\` = 1rem)
- Shadows: sm for inputs and small cards, md for dropdowns and popovers, lg for dialogs
`;
}
