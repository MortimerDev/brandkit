# Working on brandkit

pnpm monorepo, two packages:

- `packages/brandkit` (`@mortimerdev/brandkit`): TypeScript, ESM only, no runtime dependencies. `src/color.ts` (OKLCH + WCAG maths), `src/palette.ts` (scales), `src/brandkit.ts` (`createBrandkit`, semantic token selection), `src/fonts.ts`, `src/questionnaire.ts`, `src/exporters/*` (one entry point each).
- `packages/brandkit-css` (`@mortimerdev/brandkit-css`): plain CSS in `src/`, layered `reset, tokens, base, components`. Only uses `--bk-*` tokens the CSS exporter defines, each with a fallback (tested).

## Commands

- `pnpm check` runs lint, format check, typecheck, build and tests. Run it before finishing.
- Tests use Vitest. Exporter tests compile real output with Tailwind v4, Sass + Bootstrap 5.3 and Lightning CSS.

## Rules

- Work on a branch and open a PR; don't commit straight to `main`.
- Keep output deterministic and JSON-serialisable.
- Never weaken contrast guarantees; the colour sweep test must pass.
- Fonts: SIL OFL Google Fonts only, referenced by name.
- Add a changeset (`pnpm changeset`) for user-facing changes.
- Paid/hosted features (AI generation, credits, accounts) do not belong in this repo.
