# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Initial workspace structure: React frontend + Rust WASM chess engine
- CI workflow, release workflow, wasm size checks, and packaging
- Tailwind utilities and UI refinements for the chess frontend

### Changed

- Converted many inline styles to Tailwind/utilities and added lazy-loading for heavy UI pieces
- Improved Vite rollup manualChunks to split large vendor bundles

### Fixed

- Various lint and style issues

## [0.1.0] - 2026-05-21

- Prep release artifacts and initial public release
