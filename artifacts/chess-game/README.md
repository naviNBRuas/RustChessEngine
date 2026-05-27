# Chess Game (frontend)

Local dev

```bash
# from repo root
pnpm install
pnpm --filter ./artifacts/chess-game run dev
```

Build

```bash
pnpm --filter ./artifacts/chess-game run build
# build wasm engine (root helper)
pnpm run wasm:build
```

Tests

```bash
pnpm --filter ./artifacts/chess-game run test
```

Publishing

The repo-level `pnpm run release` will run the workspace build and wasm build. Create a tag and push to GitHub to trigger the release workflow.
