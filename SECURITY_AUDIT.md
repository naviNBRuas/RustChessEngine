# Security and License Audit

Steps to audit dependencies and crates before publishing:

1. JavaScript/Node deps

- Run `pnpm audit` to surface known vulnerabilities.
- Consider running `npm audit --audit-level=moderate` or integrating Dependabot.
- Inspect large vendor packages (framer-motion, recharts, react-icons) for licensing issues.

1. Rust deps

- Install `cargo-audit` and run `cargo audit` inside `rust/chess-engine`.

```bash
cargo install cargo-audit || true
cd rust/chess-engine
cargo audit
```

1. Third-party assets

- Verify all images, icons, and fonts have permissive licenses for redistribution.
- Record license tags in `THIRD_PARTY_LICENSES.md` if publishing binaries.

1. Supply-chain

- Consider adding a Dependabot config or GitHub security alerts.

I can run these checks if you enable installs and CI; otherwise I can prepare PRs to integrate audit steps into CI.
