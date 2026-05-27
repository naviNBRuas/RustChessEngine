# Contributing

Thanks for contributing to RustChessEngine.

## Setup

1. Fork the repo and create a feature branch.
2. Install dependencies:

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm install
```

If pnpm blocks build scripts locally (for example `esbuild`), run:

```bash
pnpm approve-builds --all
```

## Development workflow

- Keep PRs small and focused.
- Open an issue for larger changes first.
- Follow existing style (TypeScript + Prettier).

Run checks before opening a PR:

```bash
pnpm run format
pnpm run lint
pnpm run typecheck
pnpm --filter ./artifacts/chess-game run test
```

If you modify the Rust engine, also run:

```bash
pnpm run wasm:build
```

## Releases

See `RELEASE.md` and `FINAL_CHECKLIST.md`.

## License

By contributing, you agree your contributions are licensed under MIT.
