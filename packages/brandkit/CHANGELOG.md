# @mortimerdev/brandkit

## 0.1.0

### Minor Changes

- 3f9c6ef: Personalities now each change something visible: every personality has its own corner style, type scale, neutral tint, second-colour style and font pairing (Calm previously matched Professional). All chosen personalities vote, weighted by order. Adds `PERSONALITY_TRAITS` and `meta.sources`, which records whether each choice came from the user or the personality.
- 3a0ab33: First release: brand questionnaire, OKLCH colour engine with contrast-checked light/dark semantic tokens, type/spacing/radius/shadow tokens, exporters for CSS, W3C design tokens, Tailwind v4, shadcn/ui and shadcn-vue, Bootstrap 5.3, Vuetify 3 and DESIGN.md, plus a layered CSS reset, base styles and simple components for projects with no UI library.
- c6b3071: Add `seed` for shuffling: a positive integer varies every choice the user hasn't fixed (the suggested main colour's hue, the second colour's style and hue, and the font pairing among the three best matches). Each choice shuffles independently, so fixing one leaves the others unchanged for the same seed. Adds `rankFontPairings` and `meta.seed`.
