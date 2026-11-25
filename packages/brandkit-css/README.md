# @mortimerdev/brandkit-css

A small modern CSS reset, base styles and a few framework-free components, driven by tokens from [`@mortimerdev/brandkit`](../brandkit). For projects with no UI library.

```sh
npm install @mortimerdev/brandkit-css
```

## Use

```css
@import "@mortimerdev/brandkit-css"; /* reset + base + components */
@import "./brand.css"; /* exportCss(kit) from @mortimerdev/brandkit */
```

Or link the single minified file: `@mortimerdev/brandkit-css/bundle.css`.

Pick parts individually if you prefer: `reset.css`, `base.css`, `components.css`.

## Cascade layers

Everything sits in layers declared as `@layer reset, tokens, base, components;`, so any unlayered CSS you write wins without specificity fights. Put your brand tokens in the `tokens` layer (`exportCss(kit, { layer: "tokens" })`) or leave them unlayered.

## The reset

A light "CSS starter" rather than a heavy reset: border-box sizing, no body margin, comfortable line height, balanced headings and `text-wrap: pretty` for paragraphs, block-level responsive media, form controls that inherit fonts, and reduced-motion support. Inspired by Kevin Powell's CSS Fundamentals starter, Andy Bell's "A (more) Modern CSS Reset" and Josh Comeau's "A Modern CSS Reset"; written for this package.

## Components

| Class                                | Notes                                                            |
| ------------------------------------ | ---------------------------------------------------------------- |
| `.bk-button`                         | Primary. Modifiers: `--secondary`, `--ghost`, `--danger`         |
| `.bk-label`, `.bk-input`, `.bk-hint` | `aria-invalid="true"` shows the danger border                    |
| `.bk-card`                           | Surface with border and small shadow                             |
| `.bk-nav`                            | Wraps links; `aria-current="page"` marks the active one          |
| `.bk-badge`                          | Accent-tinted pill                                               |
| `.bk-alert`                          | Info by default. Modifiers: `--success`, `--warning`, `--danger` |

Every token has a neutral fallback, so the styles work even before tokens load. Dark mode comes from the tokens.

## License

MIT
