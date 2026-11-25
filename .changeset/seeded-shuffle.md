---
"@mortimerdev/brandkit": minor
---

Add `seed` for shuffling: a positive integer varies every choice the user hasn't fixed (the suggested main colour's hue, the second colour's style and hue, and the font pairing among the three best matches). Each choice shuffles independently, so fixing one leaves the others unchanged for the same seed. Adds `rankFontPairings` and `meta.seed`.
