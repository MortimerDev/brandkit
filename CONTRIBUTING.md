# Contributing

Thanks for helping. Issues and pull requests are welcome.

## Setup

```sh
pnpm install
pnpm check   # lint, format check, typecheck, build, test
```

Node 20+ and pnpm 10 are required.

## Guidelines

- Keep the generator deterministic: the same input must always give the same output.
- Accessibility is a hard rule. Any change to colour selection must keep every pair in `checkContrast` passing; the colour sweep test enforces this.
- Exporters must produce output that actually compiles in the target library. Add or update a test that runs the real tool (Tailwind, Sass, Lightning CSS) when you touch one.
- Only add fonts published under the SIL Open Font License, referenced by name.
- Add a changeset for user-facing changes: `pnpm changeset`.

## Releasing

Releases run from `.github/workflows/release.yml` with [Changesets](https://github.com/changesets/changesets) and npm trusted publishing (no npm token stored in GitHub).

1. Merging changesets into `main` opens a "Release packages" PR.
2. Merging that PR publishes to npm with provenance.

One-time setup for each package (maintainers):

1. First publish manually from a maintainer machine, because trusted publishing cannot create a new package: `npm login`, then `npm publish --access public` in the package folder.
2. On npmjs.com, open the package's Settings, then Trusted Publisher, then GitHub Actions: owner `MortimerDev`, repository `brandkit`, workflow `release.yml`. Allow direct publishing.
3. Under publishing access, require two-factor authentication and disallow tokens.
