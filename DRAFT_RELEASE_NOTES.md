# Draft release notes

Release v0.1.0

## Highlights

- Web-based chess UI with a compact Rust-based chess engine compiled to WebAssembly
- Responsive, accessible UI using Tailwind, Framer Motion, and Radix UI components
- CI and release automation (GitHub Actions) with wasm size checks and packaged artifacts

## Notable fixes & features

- Implemented lazy-loading for heavy SVG components to reduce initial bundle size
- Added robust CI that installs Rust + wasm-pack, runs Rust unit tests, builds wasm, and packages release artifacts
- Converted many inline styles to Tailwind / utility classes and added CSS utilities for consistent styling

## Known issues

- Local installs may prompt for approving package build scripts (run `pnpm approve-builds --all` if prompted)

## Upgrade notes

- Follow `FINAL_CHECKLIST.md` to build and package artifacts before publishing

## How to publish

1. Create an annotated tag locally and push it to GitHub (this repo's release workflow triggers on tags `v*.*.*`):

```bash
git tag -a v0.1.0 -m "Release v0.1.0 — Initial stable release"
git push origin v0.1.0
```

2. Wait for GitHub Actions to finish the `release` workflow; it will create a GitHub Release and upload `release-artifacts.zip` which contains the frontend and compiled `.wasm`.

3. Download the release zip from the Release page and verify the `chess_engine_bg.wasm` file is present under `artifacts/chess-game/src/chess-wasm`.

If you want, I can create the local tag for you here (I will not push). Say "create tag locally" and I'll run the git commands to tag v0.1.0.
