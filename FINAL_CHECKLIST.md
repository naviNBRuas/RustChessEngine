# Final verification checklist

Before publishing, perform these steps locally or via CI:

1. Install dependencies (approve builds if prompted):

```bash
pnpm approve-builds --all
pnpm install
```

1. Run workspace typecheck & build:

```bash
pnpm run build
```

1. Run wasm build:

```bash
pnpm run wasm:build
```

1. Run tests:

```bash
pnpm --filter ./artifacts/chess-game run test
```

1. Run lint & format checks:

```bash
pnpm run format:check
pnpm --filter ./artifacts/chess-game run lint
```

1. Build production assets and run analysis (optional):

```bash
pnpm --filter ./artifacts/chess-game run analyze
```

1. Package release artifacts:

```bash
pnpm run release
pnpm run package:zip
```

1. Create tag and push to trigger GitHub release workflow.
