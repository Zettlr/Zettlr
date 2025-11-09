# Zettlr Context Documentation

This folder contains comprehensive documentation about the Vim Fixed Keyboard Layout feature development, architectural decisions, and migration process.

## Feature Documentation

### Core Feature Files
- **[VIM_FIXED_KEYBOARD_EXPLANATION.md](VIM_FIXED_KEYBOARD_EXPLANATION.md)** - Complete feature specification and design rationale
- **[KEYBOARD_TRAINING_FEATURE.md](KEYBOARD_TRAINING_FEATURE.md)** - Interactive key training UI specification
- **[VIM_FIXED_KEYBOARD_MIGRATION_COMPLETE.md](VIM_FIXED_KEYBOARD_MIGRATION_COMPLETE.md)** - Migration completion summary

### Migration Documentation
- **[MIGRATION_GUIDE_3.6.0.md](MIGRATION_GUIDE_3.6.0.md)** - Technical migration guide from CodeMirror 5 to CodeMirror 6
- **[IMPLEMENTATION_PLAN_CM6_MIGRATION.md](IMPLEMENTATION_PLAN_CM6_MIGRATION.md)** - Detailed implementation plan
- **[ZETTLR_3_RESEARCH_FINDINGS.md](ZETTLR_3_RESEARCH_FINDINGS.md)** - Research on Zettlr 3.x/4.x vs 2.3.0 architecture

### Translation Work
- **[ARABIC_TRANSLATIONS_SUMMARY.md](ARABIC_TRANSLATIONS_SUMMARY.md)** - Summary of Arabic localization work
- **[ARABIC_CURSOR_ISSUE_ANALYSIS.md](ARABIC_CURSOR_ISSUE_ANALYSIS.md)** - Analysis of RTL cursor positioning issues in CodeMirror 5

### Decision Documents
- **[GO_NO-GO_DECISION.md](GO_NO-GO_DECISION.md)** - Decision rationale for migrating to Zettlr 3.6.0

## Debugging & Fixes

### Configuration Issues
- **[CONFIG_THROTTLING_ISSUE.md](CONFIG_THROTTLING_ISSUE.md)** - Config throttling problem and fix
- **[DEBUGGING_ANALYSIS.md](DEBUGGING_ANALYSIS.md)** - Debug analysis for config sync issues
- **[VIM_FIXED_KEYBOARD_FIX.md](VIM_FIXED_KEYBOARD_FIX.md)** - Implementation fixes

## Feature Status

### ✅ Completed (Zettlr 3.6.0)

1. **Physical Key Mapping** - Maps physical keyboard positions to Vim commands
2. **Interactive Key Training UI** - User-friendly interface to train modifier-based key combinations
3. **Arabic Translations** - Full Arabic localization for all feature UI elements
4. **Conditional UI** - Settings only show when relevant (Vim mode selected, feature enabled)
5. **Config Integration** - Proper configuration sync between UI and editor
6. **Instant Updates** - Fixed throttling issue for immediate preference changes

### Implementation Files

**Core Logic**:
- `source/common/modules/markdown-editor/hooks/vim-fixed-keyboard.ts` - Main plugin
- `source/common/modules/markdown-editor/keyboard-layout-mapper.ts` - Physical key mappings
- `source/common/modules/markdown-editor/plugins/vim-mode.ts` - Vim mode integration

**Configuration**:
- `source/app/service-providers/config/get-config-template.ts` - Main config schema
- `source/common/modules/markdown-editor/util/configuration.ts` - Editor config schema
- `source/pinia/config.ts` - Config store (with throttling fix)

**UI**:
- `source/win-preferences/schema/editor.ts` - Preferences schema (conditional fields)
- `source/common/vue/form/elements/VimKeyMappingTrainer.vue` - Training UI component
- `source/win-main/MainEditor.vue` - Editor config propagation

**Translations**:
- `static/lang/ar-AR.po` - Arabic translations

## Architecture Notes

### Config Synchronization Flow

```
Preferences UI (change setting)
    ↓
Pinia Store (setConfigValue)
    ↓
Main Process (IPC: config-provider set-config-single)
    ↓
Config Provider (updates config, broadcasts)
    ↓
All Renderer Processes (IPC: config-provider update)
    ↓
Pinia Store (immediate update - throttle bypassed for setConfigValue)
    ↓
Vue Computed Property (editorConfiguration)
    ↓
MarkdownEditor.setOptions()
    ↓
CodeMirror State (configUpdateEffect)
    ↓
Vim Plugin (reads from configField)
```

### Known Issues

1. **Throttling Architecture** - See [CONFIG_THROTTLING_ISSUE.md](CONFIG_THROTTLING_ISSUE.md)
   - **Status**: Short-term fix implemented
   - **Long-term**: Need to separate UI state from user preferences

## Development Timeline

- **2025-01-07**: Initial feature development in Zettlr 2.3.0 (CodeMirror 5)
- **2025-01-08**: Migration to Zettlr 3.6.0 (CodeMirror 6)
- **2025-01-09**: Interactive training UI implementation
- **2025-01-09**: Config sync fixes and throttling resolution

## Future Work

1. **Separate UI State Store** - Move window positions, split sizes to dedicated store
2. **Enhanced Training UI** - Add visual feedback, progress indicators
3. **Layout Presets** - Pre-configured mappings for common keyboard layouts (German, French, etc.)
4. **Export/Import** - Allow users to share trained mappings

## References

- [Zettlr Official Repository](https://github.com/Zettlr/Zettlr)
- [CodeMirror 6 Documentation](https://codemirror.net/docs/)
- [@replit/codemirror-vim](https://github.com/replit/codemirror-vim)
