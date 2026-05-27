# RustChessEngine

Monorepo with:

- React frontend: `artifacts/chess-game`
- Rust chess engine (WASM): `rust/chess-engine`

## Prerequisites

- Node.js 20+
- pnpm (via Corepack recommended)
- Rust stable toolchain
- wasm-pack (for local WASM builds)

## Setup

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm install
```

If pnpm blocks build scripts locally:

```bash
pnpm approve-builds --all
```

## Development

```bash
pnpm --filter ./artifacts/chess-game run dev
```

## Build and test

```bash
pnpm run build
pnpm run wasm:build
pnpm --filter ./artifacts/chess-game run test
```

## CI

`.github/workflows/ci.yml` runs install, typecheck, build, lint, tests, WASM build, and artifact packaging.

## Release

Create and push a tag to trigger `.github/workflows/release.yml`:

```bash
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin v0.1.0
```

See `RELEASE.md`, `FINAL_CHECKLIST.md`, and `DRAFT_RELEASE_NOTES.md`.

## License

MIT — see `LICENSE`.
