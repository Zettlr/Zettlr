# Workspace Linking Solution for Local Vim Plugin Development

## Problem Statement

When developing the vim plugin locally within a yarn workspace, TypeScript builds fail due to duplicate CodeMirror package instances causing type conflicts. The workspace package installs its own CodeMirror dependencies, creating incompatible type declarations.

## Root Cause

The issue stems from yarn workspaces creating separate node_modules for workspace packages, leading to:

1. **Duplicate Package Instances**: Main app uses `node_modules/@codemirror/*`, workspace package uses `packages/codemirror-vim/node_modules/@codemirror/*`
2. **Type Conflicts**: TypeScript sees these as different types even though they're the same packages
3. **Build Errors**:
   - `EditorView` types from different instances are incompatible
   - Function return types reference conflicting module paths

## Solution: TypeScript Paths Configuration

The established best practice is using TypeScript's `paths` configuration to force module resolution to the root node_modules.

### Implementation

**File**: `packages/codemirror-vim/tsconfig.json`

```json
{
  "compilerOptions": {
    "typeRoots": ["./node_modules/@types"],
    "paths": {
      "@codemirror/*": ["../../node_modules/@codemirror/*"]
    }
  }
}
```

### How It Works

1. **Module Resolution Override**: Forces TypeScript to resolve all `@codemirror/*` imports from the root node_modules
2. **Type Unification**: Ensures all CodeMirror types reference the same declarations
3. **Preserves Runtime**: Maintains yarn workspace linking behavior for actual module loading
4. **Standard Practice**: Uses TypeScript's built-in module resolution system

## Alternative Approaches Tried

### ❌ Yarn Link (Portal Links)
```bash
yarn link /path/to/external/vim/plugin
```
**Issue**: Creates portal links that cause the same duplicate dependency problem as workspaces.

### ❌ Direct File Modifications
Modifying vim plugin source code to accommodate workspace-specific paths.
**Issue**: Makes plugin unusable outside this specific configuration.

### ❌ Complex Resolution Hacks
Using yarn resolutions or nohoist configurations.
**Issue**: Brittle solutions that break easily with dependency updates.

## Workspace Setup

### Directory Structure
```
Zettlr-official/
├── package.json              # Root with workspaces config
├── packages/
│   └── codemirror-vim/        # Git submodule/clone
│       ├── package.json       # Vim plugin with peer dependencies
│       ├── tsconfig.json      # TypeScript paths configuration
│       └── src/               # Vim plugin source
└── node_modules/
    └── @codemirror/           # Shared CodeMirror packages
```

### Root package.json Configuration
```json
{
  "workspaces": ["packages/*"],
  "dependencies": {
    "@replit/codemirror-vim": "workspace:*"
  }
}
```

### Workspace package.json Configuration
```json
{
  "peerDependencies": {
    "@codemirror/commands": "6.x.x",
    "@codemirror/language": "6.x.x",
    "@codemirror/search": "6.x.x",
    "@codemirror/state": "6.x.x",
    "@codemirror/view": "6.x.x"
  },
  "devDependencies": {
    "@codemirror/buildhelper": "^1.0.2",
    "@codemirror/language": "6.x.x",
    "typescript": "^5.8.2"
  }
}
```

## Build Process

### Manual Build
```bash
# Build workspace vim plugin
yarn workspace @replit/codemirror-vim build

# Or from workspace directory
cd packages/codemirror-vim && yarn build
```

### Automatic Pre-build
Added to root package.json scripts:
```json
{
  "scripts": {
    "prebuild": "yarn workspace @replit/codemirror-vim build",
    "prestart": "yarn workspace @replit/codemirror-vim build"
  }
}
```

## Benefits

✅ **Local Development**: Edit vim plugin source without git commits
✅ **Standard Solution**: Uses established TypeScript module resolution patterns
✅ **No Hacking**: Pure configuration, no code modifications
✅ **Preserves Architecture**: Maintains peer dependency structure
✅ **Cross-Platform**: Works consistently across development environments
✅ **Arabic Cursor Fixes**: Preserves critical functionality from forked repository

## Lessons Learned

### Do ✅
- Use TypeScript `paths` for module resolution in monorepos
- Configure peer dependencies properly in workspace packages
- Research established patterns before creating custom solutions
- Test both build-time and runtime behavior

### Don't ❌
- Modify plugin source code for workspace-specific issues
- Use yarn link/portal links for packages with peer dependencies
- Create complex yarn resolution hacks
- Assume yarn workspace "just works" with peer dependencies

### Key Insight
The issue was **build-time type conflicts**, not runtime module loading conflicts. The previous Claude's workspace setup was actually working at runtime (no "Unrecognized extension" errors), but failing at build time due to TypeScript seeing duplicate type declarations.

## References

- [TypeScript Module Resolution](https://www.typescriptlang.org/docs/handbook/module-resolution.html)
- [Yarn Workspaces Documentation](https://yarnpkg.com/features/workspaces)
- [Stack Overflow: TypeScript dependencies in yarn workspaces](https://stackoverflow.com/questions/65615642/resolving-typescript-dependencies-in-yarn-workspaces)
- [Peer Dependencies in Monorepos](https://stackoverflow.com/questions/58027193/peer-dependencies-in-a-monorepo)