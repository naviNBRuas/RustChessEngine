# Release process

Steps to create a release (manual):

1. Update changelog (see CHANGELOG_TEMPLATE.md) and bump versions.
1. Run the workspace release build and wasm build:

```bash
pnpm run release
```

1. Commit any generated changes and push a tag, e.g.:

```bash
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

1. A GitHub Actions workflow will run on tag push to build artifacts and create a release.
