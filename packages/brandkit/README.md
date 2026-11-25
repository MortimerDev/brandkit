# @mortimerdev/brandkit

Generate an accessible design system from a few brand answers: OKLCH colour scales, contrast-checked light and dark semantic tokens, typography, spacing, radius and shadows, with exporters for your stack.

```sh
npm install @mortimerdev/brandkit
```

## Generate

```ts
import { createBrandkit } from "@mortimerdev/brandkit";

const kit = createBrandkit({
  name: "Acme", // required
  description: "Tools for makers.",
  primary: "#2563eb", // your brand colour (kept exactly where it passes contrast)
  accent: "#f59e0b", // optional; derived from primary otherwise
  personality: ["professional", "friendly"], // most important first
  roundness: "soft", // "sharp" | "soft" | "round"
  fontPairing: "inter", // see FONT_PAIRINGS; chosen from personality otherwise
});
```

The result is plain, deterministic JSON:

- `scales`: `primary`, `accent`, `neutral`, `success`, `warning`, `danger`, `info`, each with steps 50–950.
- `semantic.light` / `semantic.dark`: `background`, `foreground`, `surface`, `muted`, `muted-foreground`, `border`, `input`, `ring`, `link`, `primary` / `primary-foreground` / `primary-hover`, `secondary`, `accent`, and fill + subtle variants for each status colour. Each records which scale step it came from.
- `typography`: font pairing, CSS font stacks, Google Fonts URL and a modular type scale.
- `spacing`, `radius`, `shadow`.
- `contrast`: every checked pair with its ratio and AA/AAA result.

### Accessibility

Every text/background pair meets WCAG 2.2 AA (4.5:1) in both modes, and input borders and focus rings meet 3:1. The test suite checks this across 160+ colours, including pure white, black, yellow and greys. Contrast is WCAG 2 contrast; it's guidance for colour pairs, not a full accessibility audit.

## Questionnaire

`BRAND_QUESTIONS` describes the questions a UI can render, and `answersToInput` turns form answers into generator input:

```ts
import { BRAND_QUESTIONS, answersToInput, createBrandkit } from "@mortimerdev/brandkit";

const kit = createBrandkit(answersToInput(formValues));
```

## Export

Each exporter is a separate entry point, so you only ship what you use.

```ts
import { exportCss } from "@mortimerdev/brandkit/css";
import { exportTailwind } from "@mortimerdev/brandkit/tailwind";
import { exportShadcn } from "@mortimerdev/brandkit/shadcn";
import { exportBootstrap } from "@mortimerdev/brandkit/bootstrap";
import { exportVuetify, exportVuetifyModule } from "@mortimerdev/brandkit/vuetify";
import { exportDtcg, exportDtcgJson } from "@mortimerdev/brandkit/dtcg";
import { exportDesignMd } from "@mortimerdev/brandkit/design-md";
```

### Plain CSS (no library)

```ts
exportCss(kit, { prefix: "bk", format: "oklch", darkMode: "both", layer: "tokens" });
```

Custom properties such as `--bk-primary` and `--bk-primary-600`. Dark mode follows the OS and can be forced with `data-theme="dark"` / `data-theme="light"`. Pair it with [`@mortimerdev/brandkit-css`](../brandkit-css) for a reset, base styles and components.

### Tailwind CSS v4

```css
@import "tailwindcss";
@import "./brand.css"; /* exportTailwind(kit) */
```

Utilities: `bg-primary text-primary-foreground`, `bg-surface`, `text-muted-foreground`, `border-border`, `ring-ring`, `bg-primary-100`, `font-heading`, `rounded-lg`, `shadow-md`. Dark mode uses `.dark` or `data-theme="dark"` (`darkMode: "media"` to follow the OS instead).

### shadcn/ui and shadcn-vue

Replace the `:root`, `.dark` and `@theme inline` blocks in `globals.css` (React) or `main.css` (Vue) with `exportShadcn(kit)`. Adds `success`, `warning` and `info` alongside the standard variables. `accent: "brand"` tints shadcn's hover colour with your accent.

### Bootstrap 5.3

```scss
@import "brand"; // exportBootstrap(kit)
@import "bootstrap/scss/bootstrap";
```

Sets theme colours, body/border/link colours for light and `data-bs-theme="dark"`, fonts, radii and shadows.

### Vuetify 3

```ts
import { createVuetify } from "vuetify";
import brandTheme from "./brand-theme.js"; // exportVuetifyModule(kit)

export default createVuetify({ theme: brandTheme });
```

### Design tokens (DTCG)

`exportDtcgJson(kit)` writes W3C Design Tokens JSON for Tokens Studio, Figma plugins or Style Dictionary. Semantic tokens alias the scales (`{color.primary.600}`), with `semantic.light` and `semantic.dark` groups.

### DESIGN.md

`exportDesignMd(kit, { library: "tailwind" })` writes a design brief for AI coding assistants and people: rules, semantic colour usage, scales, typography and library-specific instructions. Libraries: `css`, `tailwind`, `shadcn`, `shadcn-vue`, `bootstrap`, `vuetify`.

## Colour utilities

Also exported: `fromHex`, `fromOklch`, `formatOklch`, `gamutMap`, `contrastRatio`, `relativeLuminance`, `generateScale`, `generateNeutralScale`.

## Fonts

All pairings use families from Google Fonts under the SIL Open Font License. The kit references fonts by name and gives you a Google Fonts URL; no font files are bundled. Self-hosting is recommended for production.

## License

MIT
