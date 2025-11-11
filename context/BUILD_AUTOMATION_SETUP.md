# Build Automation Setup for Zettlr Arabic Edition

## Overview

This document describes the GitHub Actions workflow setup for building Zettlr Arabic Edition packages for all platforms (Linux, macOS, Windows).

## Initial Challenges and Solutions

### Challenge 1: Vim Plugin Lockfile Modification

**Problem**: Running `yarn install` inside the vim plugin submodule tried to modify its lockfile, causing CI failure with `--immutable` mode.

**Solution**: Use `yarn workspace @replit/codemirror-vim build` from the root instead of `cd packages/codemirror-vim && yarn install && yarn build`.

**Files Changed**: `.github/workflows/build-arabic.yml`

### Challenge 2: TypeScript Type Errors in Vim Plugin

**Problem**: Running `tsc` on the vim plugin in CI produced type errors that didn't occur locally.

**Solution**: Skip type generation entirely in CI builds - only build JavaScript with `cm-buildhelper`. Type definitions aren't needed for runtime, only for development.

**Build Steps**:
```yaml
- name: Build vim plugin
  run: |
    npx cm-buildhelper packages/codemirror-vim/src/index.ts
    node packages/codemirror-vim/scripts/addVersion.cjs
```

### Challenge 3: Yarn Workspace Command Failure

**Problem**: `yarn workspace @replit/codemirror-vim build` failed with "Couldn't find node_modules state file" in CI.

**Root Cause**: Workspace package linking wasn't properly established after `yarn install --immutable`.

**Solution**: Run build commands directly from root using `npx`:
```yaml
npx cm-buildhelper packages/codemirror-vim/src/index.ts
node packages/codemirror-vim/scripts/addVersion.cjs
```

This works because `npx` finds binaries in `node_modules/.bin` from the parent workspace.

### Challenge 4: Windows Azure Trusted Signing

**Problem**: Windows builds failed with error about missing `AZURE_TENANT_ID` because `electron-builder.yml` had Azure signing configured.

**Solution**: Comment out `azureSignOptions` section in `electron-builder.yml` for the fork:
```yaml
# NOTE: Azure Trusted Signing disabled for Arabic Edition fork
# (unsigned builds for easier distribution)
# azureSignOptions:
#   publisherName: "Hendrik Erz"
#   endpoint: "https://neu.codesigning.azure.net/"
#   certificateProfileName: "zettlr-code-sign-cert"
#   codeSigningAccountName: "zettlr"
```

**Files Changed**: `electron-builder.yml`

### Challenge 5: macOS Code Signature Invalid Crash

**Problem**: macOS app crashed on launch with `SIGKILL (Code Signature Invalid)` error, even after removing quarantine with `xattr -cr`.

**Root Cause**: The app had NO code signature at all. macOS requires at least an ad-hoc signature.

**Solution**: Add ad-hoc code signing step after packaging:
```yaml
- name: Build macOS arm64 packages (with ad-hoc signing)
  run: |
    yarn package:mac-arm
    # Ad-hoc sign the app to prevent code signature crashes
    codesign --force --deep --sign - "out/Zettlr-darwin-arm64/Zettlr.app"
    yarn release:mac-arm
```

The command `codesign --sign -` creates a valid ad-hoc signature without requiring developer certificates.

**Files Changed**: `.github/workflows/build-arabic.yml`

### Challenge 6: Lint Errors from Vim Plugin Submodule

**Problem**: ESLint was checking third-party vim plugin code which had many violations.

**Solution**: Create `.eslintignore` file:
```
packages/codemirror-vim/**
```

**Files Changed**: `.eslintignore` (new file)

## Workflow Features

### Selective Platform Building

Added workflow inputs to allow rebuilding only specific platforms:

```yaml
on:
  workflow_dispatch:
    inputs:
      build_linux:
        description: 'Build Linux'
        required: false
        default: 'true'
        type: boolean
      build_macos:
        description: 'Build macOS'
        required: false
        default: 'true'
        type: boolean
      build_windows:
        description: 'Build Windows'
        required: false
        default: 'true'
        type: boolean
```

Each job has a condition:
```yaml
if: ${{ github.event_name == 'push' || inputs.build_linux == true }}
```

**Benefit**: Allows rebuilding only failed platforms without wasting resources on successful builds.

**Usage**:
```bash
# Build only Windows
gh workflow run build-arabic.yml --repo diraneyya/Zettlr-Arabic --ref v3.6.0-arabic \
  -f build_linux=false -f build_macos=false -f build_windows=true
```

### Complete Build Pipeline

1. **Checkout with submodules**: `submodules: recursive`
2. **Install dependencies**: `yarn install --immutable`
3. **Build vim plugin**: Direct `npx` commands from root
4. **Package app**: Architecture-specific scripts (`package:mac-arm`, etc.)
5. **Sign (macOS only)**: Ad-hoc `codesign` step
6. **Create installers**: `release:*` scripts
7. **Upload artifacts**: GitHub Actions artifacts for 90 days
8. **Create release** (tag-triggered only): Download all artifacts and create draft release

## Files Modified

### New Files Created
- `.github/workflows/build-arabic.yml` - Custom build workflow
- `.eslintignore` - Exclude vim plugin from linting
- `BUILDING.md` - Human-readable build documentation

### Modified Files
- `electron-builder.yml` - Commented out Azure signing
- `packages/codemirror-vim/tsconfig.json` - Updated typeRoots path (in zettlr-arabic branch)

## Vim Plugin Integration

### Submodule Structure
- **Submodule**: `packages/codemirror-vim`
- **Remote**: `github:diraneyya/codemirror-vim`
- **Branch**: `zettlr-arabic` (includes workspace config)
- **Clean branch**: `fix/cursor-arabic-connected-characters` (for upstream PR)

### Workspace Configuration

The vim plugin uses `workspace:*` protocol in main repo's `package.json`:
```json
"@replit/codemirror-vim": "workspace:*"
```

The submodule's `tsconfig.json` (zettlr-arabic branch only) includes paths for local dev:
```json
{
  "compilerOptions": {
    "paths": {
      "@codemirror/*": ["../../node_modules/@codemirror/*"]
    },
    "typeRoots": ["../../node_modules/@types"]
  }
}
```

**Important**: These paths are for LOCAL DEVELOPMENT ONLY and should NOT be committed to upstream.

## Build Output

### Linux
- `Zettlr-{version}-amd64.deb` (Debian/Ubuntu)
- `Zettlr-{version}-x86_64.rpm` (Fedora/RHEL)
- `Zettlr-{version}-x86_64.AppImage` (Universal)
- `Zettlr-{version}-x64.tar.gz` (Generic)

### macOS
- `Zettlr-{version}-arm64.dmg` (Apple Silicon)

### Windows
- `Zettlr-{version}-x64.exe` (Installer)

## Unsigned Builds Notice

All builds are **unsigned** to simplify fork distribution. Users may need to:

**macOS**:
1. Download and install the .dmg
2. Run: `sudo xattr -cr /Applications/Zettlr.app`
3. Open normally

**Windows**:
- Click "More info" → "Run anyway" on SmartScreen warning

**Linux**:
- No additional steps needed

## Release Process

### Creating a New Tagged Release

```bash
# Update version in package.json
git add package.json
git commit -m "chore: Bump version to 3.6.0-arabic-beta2"

# Create and push tag
git tag v3.6.0-arabic-beta2
git push fork v3.6.0-arabic-beta2

# This triggers the workflow automatically
# Builds complete and create draft release with all binaries
```

### Updating an Existing Release

When you need to update binaries for an existing tag (e.g., after fixing icons):

```bash
# Commit your changes
git add resources/icons/
git commit -m "feat: Update app icons"

# Push to branch
git push fork v3.6.0-arabic

# Force-move the tag to the new commit
git tag -f v3.6.0-arabic-beta1
git push fork v3.6.0-arabic-beta1 --force

# The workflow will automatically:
# 1. Rebuild all platforms
# 2. Update the existing release
# 3. Replace all binaries (overwrite: true)
```

**How it works**: The workflow uses `softprops/action-gh-release@v2` with `overwrite: true`, which replaces existing release assets when the same tag is pushed again.

## Tools Used

### GitHub CLI (`gh`)
```bash
# Trigger workflow
gh workflow run build-arabic.yml --repo diraneyya/Zettlr-Arabic --ref v3.6.0-arabic

# Monitor builds
gh run list --repo diraneyya/Zettlr-Arabic --workflow=build-arabic.yml

# Check specific run
gh run view <run-id> --repo diraneyya/Zettlr-Arabic

# View logs
gh run view <run-id> --repo diraneyya/Zettlr-Arabic --log-failed
```

### Code Signing (macOS)
```bash
# Ad-hoc signing (no certificate required)
codesign --force --deep --sign - "path/to/Zettlr.app"

# Remove quarantine
sudo xattr -cr /Applications/Zettlr.app
```

### Yarn Workspace Commands
```bash
# Build vim plugin from root
yarn workspace @replit/codemirror-vim build

# Install all dependencies (including workspace packages)
yarn install --immutable
```

## References

- **Workflow file**: `.github/workflows/build-arabic.yml`
- **Electron Builder config**: `electron-builder.yml`
- **Forge config**: `forge.config.js`
- **Package scripts**: `package.json` (scripts section)
