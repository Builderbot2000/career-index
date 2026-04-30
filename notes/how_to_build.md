# How to Build & Publish

## Local build

```bash
npm run build          # compiles main process, renderer, and all adapter bundles
npm run build:dist     # same + packages into dist/ (.AppImage, .deb, .exe)
```

## Publish a release to GitHub

Bump the version in `package.json`, then push a version tag. The CI workflow picks it up and uploads the built binaries to a GitHub Release automatically.

```bash
# Example: releasing v1.2.0
npm version 1.2.0          # bumps package.json and creates a git tag
git push && git push --tags
```

The Actions run will:
1. Build the app and all adapter bundles on Linux and Windows
2. Package with electron-builder
3. Create (or update) a GitHub Release at that tag and attach the `.AppImage`, `.deb`, and `.exe` installer

The release starts as a **draft** if one already exists for that tag, or creates a new one. Publish it manually from the GitHub Releases page when ready.
