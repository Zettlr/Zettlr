# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## CRITICAL: Repository Context

**This repository** (`/Users/orwa/repos/Zettlr-official`) contains Zettlr **3.6.0** (CodeMirror 6) and is the **active development target** for the Vim Fixed Keyboard Layout feature.

**Sibling repository** (`/Users/orwa/repos/zettlr`) contains Zettlr **2.3.0** (CodeMirror 5) with the **v2.3.0-arabic** branch, where the feature was initially prototyped.

**Historical Context**: We initially developed the Vim fixed keyboard feature in Zettlr 2.3.0 + CM5, then migrated it to Zettlr 3.6.0 (CM6) due to RTL cursor positioning bugs in CodeMirror 5. **All active development happens in THIS repository.**

## Comprehensive Documentation

**All detailed documentation is located in the `/context` folder:**

📁 **[context/README.md](context/README.md)** - Start here for complete feature documentation, migration guides, and architectural decisions.

### Key Documents

- **Feature Spec**: [context/VIM_FIXED_KEYBOARD_EXPLANATION.md](context/VIM_FIXED_KEYBOARD_EXPLANATION.md)
- **Training UI**: [context/KEYBOARD_TRAINING_FEATURE.md](context/KEYBOARD_TRAINING_FEATURE.md)
- **Migration Guide**: [context/MIGRATION_GUIDE_3.6.0.md](context/MIGRATION_GUIDE_3.6.0.md)
- **Config Issues**: [context/CONFIG_THROTTLING_ISSUE.md](context/CONFIG_THROTTLING_ISSUE.md)
- **Arabic Translations**: [context/ARABIC_TRANSLATIONS_SUMMARY.md](context/ARABIC_TRANSLATIONS_SUMMARY.md)

## Project Overview

Zettlr is an Electron-based Markdown editor for the 21st century, built with TypeScript, Vue 3, and CodeMirror 6. It's designed for academic writing, research, and Zettelkasten knowledge management.

**Version**: 3.6.0
**License**: GPL-3.0
**Tech Stack**: Electron, TypeScript, Vue 3, Pinia, CodeMirror 6, Vite

## Development Commands

### Starting Development

```bash
# Install dependencies (first time or after pulling)
yarn install

# Start app in development mode
yarn start

# Start app in safe mode (no plugins)
yarn start:safe
```

### Building and Packaging

```bash
# Lint code
yarn lint

# Run tests
yarn test:unit
yarn test:integration

# Build for production
yarn package
```

### Utility Commands

```bash
# Reveal.js templates
yarn reveal:build

# Citation utilities
yarn update:citeproc
```

## Architecture Overview

### Process Architecture

Zettlr is an Electron app with:
- **Main process**: Application orchestration, file system, config management
- **Renderer processes**: Multiple windows (main window, preferences, etc.)
- **Communication**: IPC (Inter-Process Communication) via Electron

### Directory Structure (Key Paths for Vim Feature)

```
source/
├── app/
│   └── service-providers/
│       └── config/
│           └── get-config-template.ts      # Main config schema (vimFixedKeyboardLayout, vimKeyMappings)
│
├── common/
│   ├── modules/
│   │   └── markdown-editor/
│   │       ├── index.ts                    # MarkdownEditor class, setOptions()
│   │       ├── hooks/
│   │       │   └── vim-fixed-keyboard.ts   # Main vim plugin (keydown handler, mapping logic)
│   │       ├── plugins/
│   │       │   └── vim-mode.ts             # Vim mode integration
│   │       ├── keyboard-layout-mapper.ts   # Physical key → Vim command mappings
│   │       └── util/
│   │           └── configuration.ts        # Editor config schema, configField StateField
│   │
│   └── vue/
│       └── form/
│           └── elements/
│               └── VimKeyMappingTrainer.vue # Interactive training UI component
│
├── pinia/
│   └── config.ts                           # Config store (with throttling fix)
│
├── win-main/
│   └── MainEditor.vue                      # Editor instance, editorConfiguration computed prop
│
└── win-preferences/
    └── schema/
        └── editor.ts                       # Preferences UI schema (conditional fields)

static/
└── lang/
    └── ar-AR.po                            # Arabic translations
```

## Vim Fixed Keyboard Layout Feature

### Feature Summary

Enables Vim Normal mode commands to work with non-Latin keyboards (Arabic, Hebrew, etc.) by mapping physical keyboard positions to Vim commands instead of relying on character input.

**Status**: ✅ **FULLY IMPLEMENTED** in Zettlr 3.6.0

### Implementation Components

1. **Physical Key Mapping** (`keyboard-layout-mapper.ts`)
   - Maps physical keys (KeyJ, KeyK, etc.) to Vim commands (j, k, etc.)
   - Works regardless of active keyboard layout

2. **Interactive Training UI** (`VimKeyMappingTrainer.vue`)
   - User-friendly interface to train modifier-based keys (e.g., Alt+8 for "{")
   - Click-to-capture key combinations
   - Real-time feedback with modifier badges

3. **Config Integration**
   - `vimFixedKeyboardLayout: boolean` - Feature enable/disable
   - `vimKeyMappings: Record<string, KeyMapping>` - User-trained key combinations

4. **Conditional UI** (`editor.ts` schema)
   - Vim settings only show when Vim mode is selected
   - Training UI only shows when feature is enabled
   - Uses Vue computed properties for reactive rendering

5. **Instant Config Updates** (`config.ts` fix)
   - Bypasses 1-second throttle for explicit user actions
   - See [context/CONFIG_THROTTLING_ISSUE.md](context/CONFIG_THROTTLING_ISSUE.md)

### Key Files Modified

- `source/common/modules/markdown-editor/hooks/vim-fixed-keyboard.ts` (NEW)
- `source/common/modules/markdown-editor/keyboard-layout-mapper.ts` (NEW)
- `source/common/vue/form/elements/VimKeyMappingTrainer.vue` (NEW)
- `source/app/service-providers/config/get-config-template.ts` (MODIFIED)
- `source/common/modules/markdown-editor/util/configuration.ts` (MODIFIED)
- `source/win-preferences/schema/editor.ts` (MODIFIED)
- `source/win-main/MainEditor.vue` (MODIFIED)
- `source/pinia/config.ts` (MODIFIED - throttling fix)
- `static/lang/ar-AR.po` (MODIFIED - Arabic translations)

## Configuration System

### Config Flow

```
User changes setting in Preferences UI
    ↓
configStore.setConfigValue(property, value)
    ↓
IPC → Main Process → Config Provider
    ↓
Broadcast to all renderer processes
    ↓
Pinia store receives update (immediate, bypasses throttle)
    ↓
editorConfiguration computed property updates
    ↓
Vue watch calls editor.setOptions(newConfig)
    ↓
MarkdownEditor dispatches configUpdateEffect
    ↓
CodeMirror configField StateField updates
    ↓
Vim plugin reads config via this.view.state.field(configField)
```

### Config Properties

**Main Config** (`ConfigOptions`):
- `editor.vimFixedKeyboardLayout: boolean`
- `editor.vimKeyMappings: Record<string, KeyMapping>`

**Editor Config** (`EditorConfiguration`):
- Same properties, synced from main config
- Updated via `configUpdateEffect` StateEffect

### IMPORTANT: Config Throttling

The config store previously had a **1-second throttle** that delayed all config updates. This has been fixed by immediately updating the local config when `setConfigValue()` is called, bypassing the throttle for explicit user actions.

See [context/CONFIG_THROTTLING_ISSUE.md](context/CONFIG_THROTTLING_ISSUE.md) for details.

## Testing

```bash
# Run all tests
yarn test

# Run specific test suite
yarn test:unit -- --grep "vim"
```

### Manual Testing Checklist

1. **Conditional UI**:
   - [ ] Vim settings hidden when input mode = Normal/Emacs
   - [ ] Vim settings visible when input mode = Vim
   - [ ] Training UI hidden when feature disabled
   - [ ] Training UI visible when feature enabled

2. **Key Training**:
   - [ ] Click "Key Combination" field activates capture mode
   - [ ] Pressing key combo displays correctly with modifier badges
   - [ ] Clear button (×) removes mapping
   - [ ] All 13 pre-populated characters present

3. **Runtime Behavior**:
   - [ ] Enable feature → j/k/h/l work with Arabic keyboard
   - [ ] Disable feature → j/k/h/l stop working (Arabic characters appear)
   - [ ] Changes take effect **instantly** (no delay)

4. **Arabic Interface**:
   - [ ] Change language to Arabic
   - [ ] All vim setting labels display in Arabic
   - [ ] Training UI instructions in Arabic

## Common Issues

### Config Changes Not Taking Effect

**Symptom**: Toggling checkbox doesn't enable/disable feature

**Cause**: Missing properties in `editorConfiguration` computed property (MainEditor.vue)

**Fix**: Ensure `vimFixedKeyboardLayout` and `vimKeyMappings` are included in the computed property

### Delayed Updates

**Symptom**: Settings take 1+ seconds to apply

**Cause**: Config throttling (previous architecture issue)

**Fix**: Implemented in `source/pinia/config.ts` - immediate update on setConfigValue()

### Plugin Always Active

**Symptom**: Mappings work even when feature is disabled

**Cause**: Guard clause not properly checking config

**Fix**: Ensure `configField` is properly updated when preferences change

## Important Notes

- **DO NOT commit** auto-generated files (lang files, CSL files, reveal.js builds)
- **Always test** with both Latin and non-Latin keyboards
- **Check translations** when adding new UI strings
- **Document architectural decisions** in `/context` folder
- **Use TypeScript strict mode** - no `any` types without justification

## Path Aliases (tsconfig.json)

```typescript
import '@common/*'    // → source/common/*
import '@providers/*' // → source/app/service-providers/*
import '@dts/*'       // → source/types/*
```

## Related Resources

- [Zettlr Official Docs](https://docs.zettlr.com/)
- [CodeMirror 6 Documentation](https://codemirror.net/docs/)
- [@replit/codemirror-vim](https://github.com/replit/codemirror-vim)
- [Electron IPC Guide](https://www.electronjs.org/docs/latest/tutorial/ipc)

---

**For detailed feature documentation, implementation guides, and architectural decisions, see the [/context](context/) folder.**
