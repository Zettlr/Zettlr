# Building Zettlr Arabic Edition

This document explains how to build the Zettlr Arabic Edition from source and create release packages for distribution.

## Prerequisites

- **Node.js**: Version 22 (specified in `.github/workflows/build-arabic.yml`)
- **Yarn**: Package manager (enable with `corepack enable`)
- **Git**: With submodule support

## Local Development Build

### 1. Clone the Repository

```bash
git clone --recursive https://github.com/diraneyya/Zettlr-Arabic.git
cd Zettlr-Arabic
```

**Important**: Use `--recursive` to fetch the vim plugin submodule at `packages/codemirror-vim`.

### 2. Install Dependencies

```bash
corepack enable  # Enable yarn
yarn install --immutable
```

### 3. Build the Vim Plugin

The vim plugin is a git submodule that must be built separately:

```bash
cd packages/codemirror-vim
yarn install
yarn build
cd ../..
```

### 4. Run in Development Mode

```bash
yarn start
```

Or in safe mode (no plugins):

```bash
yarn start:safe
```

## Creating Release Packages

### Automated Builds via GitHub Actions

The repository includes a custom workflow (`.github/workflows/build-arabic.yml`) that automatically builds release packages for all platforms.

#### Triggering a Build Manually

```bash
gh workflow run build-arabic.yml --repo diraneyya/Zettlr-Arabic --ref v3.6.0-arabic
```

Or via the GitHub web interface:
1. Go to **Actions** → **Build Arabic Edition**
2. Click **Run workflow**
3. Select branch: `v3.6.0-arabic`
4. Click **Run workflow**

#### Triggering a Build with a Tag (Creates Release)

To create a release draft with attached binaries:

```bash
# Create and push a tag
git tag v3.6.0-arabic-beta1
git push origin v3.6.0-arabic-beta1
```

The workflow will automatically:
1. Build for Linux (x64), macOS (arm64), and Windows (x64)
2. Create installers/packages for each platform
3. Create a GitHub release draft with all binaries attached

### Manual Local Builds

You can build packages locally for your current platform:

#### Linux (x64)

```bash
yarn package:linux-x64
yarn release:linux-x64
```

Output: `release/` directory with `.deb`, `.rpm`, `.AppImage`, and `.tar.gz` files

#### macOS (arm64)

```bash
yarn package:mac-arm
yarn release:mac-arm
```

Output: `release/` directory with `.dmg` file

Note: Code signing is disabled in the fork workflow. For signed builds, you need Apple Developer certificates.

#### macOS (x64 - Intel)

```bash
yarn package:mac-x64
yarn release:mac-x64
```

#### Windows (x64)

```bash
yarn package:win-x64
yarn release:win-x64
```

Output: `release/` directory with `.exe` installer

Note: Code signing is disabled in the fork workflow. For signed builds, you need Windows code signing certificates.

#### Windows (arm64)

```bash
yarn package:win-arm
yarn release:win-arm
```

## Build Workflow Architecture

The automated build workflow (`.github/workflows/build-arabic.yml`) performs the following:

### Three Parallel Build Jobs

1. **build-linux** (runs on `ubuntu-22.04`)
   - Builds Linux x64 packages
   - Creates: `.deb`, `.rpm`, `.AppImage`, `.tar.gz`
   - Uploads artifacts to `linux-builds`

2. **build-macos** (runs on `macos-14`)
   - Builds macOS arm64 packages (Apple Silicon)
   - Creates: `.dmg` installer
   - Code signing disabled (`CSC_IDENTITY_AUTO_DISCOVERY: false`)
   - Uploads artifacts to `macos-builds`

3. **build-windows** (runs on `windows-2022`)
   - Builds Windows x64 packages
   - Creates: `.exe` installer
   - Code signing disabled (`CSC_LINK: ''`)
   - Uploads artifacts to `windows-builds`

### Release Creation Job

After all three builds complete successfully:

- Downloads all artifacts from the three build jobs
- Creates a GitHub release draft (only when triggered by a tag)
- Attaches all installers/packages to the release
- Adds release notes describing the Arabic Edition features

### Key Features of the Workflow

✅ **Git Submodule Support**: Uses `submodules: recursive` to fetch the vim plugin
✅ **No Code Signing**: Builds work without certificates (unsigned binaries)
✅ **Parallel Builds**: All three platforms build simultaneously
✅ **Artifact Preservation**: Build outputs are uploaded and preserved
✅ **Manual Trigger**: Can be run on-demand via `workflow_dispatch`
✅ **Tag-Based Releases**: Creates release drafts when triggered by version tags

## Troubleshooting

### Issue: Lint Errors from Vim Plugin

**Solution**: The vim plugin submodule is excluded from linting via `.eslintignore`:

```
# .eslintignore
packages/codemirror-vim/**
```

This prevents third-party code from the vim plugin from failing Zettlr's eslint checks.

### Issue: Workspace Protocol Error

**Error**: `@replit/codemirror-vim@workspace:. This package doesn't seem to be present`

**Solution**: The workflow includes `submodules: recursive` in the checkout step, which ensures the vim plugin submodule is initialized before `yarn install` runs.

### Issue: Missing Build Scripts

**Error**: `yarn package:mac` not found

**Solution**: Use the architecture-specific scripts:
- Linux: `package:linux-x64`, `package:linux-arm`
- macOS: `package:mac-x64`, `package:mac-arm`
- Windows: `package:win-x64`, `package:win-arm`

Always run both `package:*` and `release:*` scripts in sequence.

### Issue: Build Fails on macOS

Check that you're using the correct runner:
- `macos-14` for arm64 builds (Apple Silicon)
- `macos-13` or `macos-latest` for x64 builds (Intel)

## Differences from Upstream Zettlr

The Arabic Edition fork includes these build-specific changes:

### 1. Added Files

- `.eslintignore` - Excludes vim plugin submodule from linting
- `.github/workflows/build-arabic.yml` - Simplified build workflow for fork

### 2. Submodule Integration

- `packages/codemirror-vim` - Git submodule pointing to forked vim plugin
- Submodule branch: `zettlr-arabic` (includes tsconfig.json paths for workspace builds)

### 3. Vim Plugin Workspace Setup

The vim plugin uses workspace protocol in `package.json`:

```json
{
  "dependencies": {
    "@replit/codemirror-vim": "workspace:."
  }
}
```

The submodule's `tsconfig.json` includes paths for local development:

```json
{
  "compilerOptions": {
    "paths": {
      "@codemirror/*": ["../../node_modules/@codemirror/*"]
    }
  }
}
```

**Important**: This paths configuration is for LOCAL DEVELOPMENT ONLY and should NOT be committed to the upstream vim plugin repository.

### 4. Removed Code Signing

The fork workflow disables code signing for easier distribution:
- macOS: `CSC_IDENTITY_AUTO_DISCOVERY: false`
- Windows: `CSC_LINK: ''`

This means the binaries are **unsigned**. Users may need to:
- **macOS**: Allow installation from unidentified developers
- **Windows**: Click "More info" → "Run anyway" on SmartScreen warning

## Distribution

### Downloading from GitHub Actions

Build artifacts are available for 90 days after a workflow run:

1. Go to the workflow run: https://github.com/diraneyya/Zettlr-Arabic/actions
2. Click on a successful run
3. Scroll to **Artifacts** section
4. Download `linux-builds`, `macos-builds`, or `windows-builds`

### Creating Official Releases

To create an official release:

1. Update version in `package.json` (e.g., `3.6.0-arabic-1.0.0`)
2. Commit the version change
3. Create and push a tag:
   ```bash
   git tag v3.6.0-arabic-1.0.0
   git push origin v3.6.0-arabic-1.0.0
   ```
4. The workflow will create a release draft
5. Edit the release notes if needed
6. Publish the release

## References

- **Upstream Zettlr**: https://github.com/Zettlr/Zettlr
- **Upstream Build Workflow**: `.github/workflows/build.yml` (reference implementation)
- **Vim Plugin Fork**: https://github.com/diraneyya/codemirror-vim
- **Electron Forge**: https://www.electronforge.io/ (packaging framework)
- **GitHub Actions Documentation**: https://docs.github.com/en/actions
