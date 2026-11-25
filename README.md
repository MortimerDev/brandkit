# brandkit

Turn a few answers about your brand into an accessible design system, ready for whatever you build with.

- **Colour palettes** in OKLCH: 11-step scales for your brand colours, a tinted neutral and status colours (success, warning, danger, info).
- **Semantic tokens** for light and dark mode, chosen so every text and background pair meets **WCAG 2.2 AA**. Your exact brand colour is kept wherever it passes.
- **Typography, spacing, radius and shadows**, with free (SIL OFL) Google Fonts pairings picked to match the brand's personality.
- **Exports** for plain CSS, W3C design tokens, Tailwind CSS v4, shadcn/ui and shadcn-vue, Bootstrap 5.3, Vuetify 3, plus a `DESIGN.md` for AI coding assistants.
- **No UI library?** `@mortimerdev/brandkit-css` gives you a small modern reset, base styles and simple components driven by the same tokens.

Deterministic, dependency-free and runs anywhere JavaScript does (browser, Node, edge).

| Package                                              | What it is                              |
| ---------------------------------------------------- | --------------------------------------- |
| [`@mortimerdev/brandkit`](packages/brandkit)         | Generator, colour engine and exporters  |
| [`@mortimerdev/brandkit-css`](packages/brandkit-css) | Reset, base styles and components (CSS) |

## Quick start

```sh
npm install @mortimerdev/brandkit
```

```ts
import { createBrandkit } from "@mortimerdev/brandkit";
import { exportTailwind } from "@mortimerdev/brandkit/tailwind";

const kit = createBrandkit({
  name: "Acme",
  primary: "#2563eb", // optional: derived from personality if omitted
  personality: ["professional", "friendly"],
});

const css = exportTailwind(kit); // save as brand.css, import after "tailwindcss"
```

Every input except `name` is optional. See the [package README](packages/brandkit) for the questionnaire, all options and every exporter.

## Pick your stack

| You use                  | Exporter                                     | Output                                              |
| ------------------------ | -------------------------------------------- | --------------------------------------------------- |
| Nothing (plain CSS)      | `@mortimerdev/brandkit/css` + `brandkit-css` | `--bk-*` custom properties, reset, base, components |
| Tailwind CSS v4          | `@mortimerdev/brandkit/tailwind`             | `@theme` file: `bg-primary`, `font-heading`…        |
| shadcn/ui (React)        | `@mortimerdev/brandkit/shadcn`               | `:root`, `.dark`, `@theme inline`                   |
| shadcn-vue               | `@mortimerdev/brandkit/shadcn`               | Same variable contract as shadcn/ui                 |
| Bootstrap 5.3            | `@mortimerdev/brandkit/bootstrap`            | Sass variables incl. dark colour mode               |
| Vuetify 3                | `@mortimerdev/brandkit/vuetify`              | `createVuetify({ theme })` options                  |
| Figma / Style Dictionary | `@mortimerdev/brandkit/dtcg`                 | W3C Design Tokens JSON                              |
| AI coding assistants     | `@mortimerdev/brandkit/design-md`            | `DESIGN.md` tailored to your library                |

## Development

```sh
pnpm install
pnpm check   # lint, format, typecheck, build, test
```

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © Andy Mortimer. Built for [mortimer.dev](https://mortimer.dev).
