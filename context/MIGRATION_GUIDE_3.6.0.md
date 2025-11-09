# Zettlr 3.6.0 Migration Guide: Vim Fixed Keyboard + RTL Support

**Date**: 2025-11-08
**Source**: Zettlr 2.3.0 (CodeMirror 5) at `/Users/orwa/repos/zettlr/`
**Target**: Zettlr 3.6.0 (CodeMirror 6) at `/Users/orwa/repos/Zettlr-official/`
**Prepared by**: Claude Code Architectural Review

---

## Executive Summary

This document provides comprehensive architectural guidance for migrating your **Vim Fixed Keyboard Layout** feature from Zettlr 2.3.0 (CodeMirror 5) to Zettlr 3.6.0 (CodeMirror 6), along with re-introducing RTL text direction support.

**Key Findings**:
- ✅ CodeMirror 6 architecture is significantly different but well-structured
- ✅ @replit/codemirror-vim v6.3.0 provides Vim.map() API for remapping
- ⚠️ RTL support was removed in 3.x migration (placeholder exists in preferences)
- ✅ Your DOM capture phase approach can be adapted to CM6
- ✅ Arabic translations exist (ar-AR.po) but may need updates

**Recommended Approach**: **Hybrid Strategy** (DOM interception + Vim.map fallback)

---

## Table of Contents

1. [Architectural Analysis](#1-architectural-analysis)
2. [Implementation Approaches Evaluation](#2-implementation-approaches-evaluation)
3. [Incremental Migration Plan](#3-incremental-migration-plan)
4. [RTL Support Strategy](#4-rtl-support-strategy)
5. [Risk Assessment & Mitigation](#5-risk-assessment--mitigation)
6. [Testing Strategy](#6-testing-strategy)
7. [File-by-File Migration Checklist](#7-file-by-file-migration-checklist)

---

## 1. Architectural Analysis

### 1.1 CodeMirror 6 vs CodeMirror 5 Differences

| Aspect | CM5 (2.3.0) | CM6 (3.6.0) |
|--------|-------------|-------------|
| **Architecture** | Monolithic instance with hooks | Extension-based composition |
| **Event System** | `cm.on('keydown', ...)` | `EditorView.domEventHandlers({...})` |
| **Vim Mode** | `codemirror/keymap/vim` | `@replit/codemirror-vim` v6.3.0 |
| **Configuration** | Direct properties | StateField + Compartments |
| **Mode Tracking** | `vim-mode-change` event | Vim state tracking via getCM() |
| **Input Handling** | `cm.getInputField()` | `view.contentDOM` or `view.dom` |

### 1.2 Zettlr 3.6.0 Editor Architecture

```
source/common/modules/markdown-editor/
├── index.ts                          # MarkdownEditor class (main entry point)
├── editor-extension-sets.ts          # Extension composition (replaces load-plugins.ts)
│   ├── getCoreExtensions()           # Core functionality for all editors
│   ├── getMarkdownExtensions()       # Markdown-specific extensions
│   └── inputModeCompartment          # Vim/Emacs mode switching
├── plugins/
│   ├── vim-mode.ts                   # Vim integration (vimPlugin() function)
│   ├── remote-doc.ts                 # Document synchronization
│   ├── typewriter.ts                 # Typewriter mode
│   └── [other plugins]
├── keymaps/
│   └── default.ts                    # Default keymap
├── util/
│   └── configuration.ts              # EditorConfiguration type + configField
└── [autocomplete/, linters/, renderers/, etc.]
```

**Key Integration Points**:
1. **Vim Plugin** (`plugins/vim-mode.ts`):
   - Wraps `@replit/codemirror-vim`
   - Defines custom Ex commands (:w, :q, :wq)
   - Applies Vim.map() for keybindings (j→gj, k→gk)
   - Returns `Extension` for composition

2. **Extension Sets** (`editor-extension-sets.ts`):
   - `inputModeCompartment` allows dynamic Vim/Emacs switching
   - Extensions loaded via `_getExtensions()` in MarkdownEditor constructor
   - Config changes trigger reconfiguration via `inputModeCompartment.reconfigure()`

3. **Configuration System**:
   - `configField`: StateField holding EditorConfiguration
   - `configUpdateEffect`: Effect for propagating config changes
   - Config accessed via `state.field(configField)`

### 1.3 @replit/codemirror-vim API

**Package**: `@replit/codemirror-vim` v6.3.0

**Key APIs**:
```typescript
import { Vim, vim, getCM, type CodeMirror } from '@replit/codemirror-vim'

// 1. Extension creation
const vimExtension: Extension = vim()

// 2. Vim API access (global)
Vim.map('j', 'gj', 'normal')              // Map key in mode
Vim.unmap('<C-f>')                        // Remove mapping
Vim.defineEx('write', 'w', (cm, params) => {...})  // Custom Ex commands

// 3. CM5 compatibility layer
const cm5: CodeMirror = getCM(view)       // Get CM5-like object from EditorView
Vim.handleKey(cm5, 'h', 'user')           // Trigger Vim command programmatically
```

**Important Notes**:
- `Vim` is a **global singleton** - mappings apply to all editor instances
- `Vim.map()` uses character-level mapping (not physical key codes)
- Mode detection requires tracking Vim state manually or via CM5 compatibility layer

### 1.4 Current Vim Integration in 3.6.0

**File**: `/Users/orwa/repos/Zettlr-official/source/common/modules/markdown-editor/plugins/vim-mode.ts`

```typescript
// Current implementation (simplified)
export function vimPlugin (): Extension {
  // Custom Ex commands
  Vim.defineEx('quit', 'q', quit)
  Vim.defineEx('write', 'w', write)
  Vim.defineEx('wq', 'wq', writeAndQuit)

  // Key remappings
  Vim.map('j', 'gj')  // Visual line movement
  Vim.map('k', 'gk')

  // Unmap conflicting keys
  Vim.unmap('<C-f>')     // Allow Ctrl+F for search
  Vim.unmap('<C-t>', 'insert')
  Vim.unmap('<C-c>', 'insert')

  return [vim()]  // Return extension array
}
```

**Config Integration** (`editor-extension-sets.ts`):
```typescript
function getCoreExtensions(options: CoreExtensionOptions): Extension[] {
  // Initial mode setup
  const inputMode: Extension[] = []
  if (options.initialConfig.inputMode === 'vim') {
    inputMode.push(vimPlugin())
  } else if (options.initialConfig.inputMode === 'emacs') {
    inputMode.push(emacs())
  }

  return [
    inputModeCompartment.of(inputMode),  // Dynamic switching compartment
    // ... other extensions
  ]
}
```

**Dynamic Mode Switching** (`index.ts`):
```typescript
private onConfigUpdate(newOptions: Partial<EditorConfiguration>): void {
  const inputModeChanged = newOptions.inputMode !== undefined &&
                           newOptions.inputMode !== this.config.inputMode

  if (inputModeChanged) {
    if (newOptions.inputMode === 'vim') {
      this._instance.dispatch({
        effects: inputModeCompartment.reconfigure(vimPlugin())
      })
    } else if (newOptions.inputMode === 'emacs') {
      this._instance.dispatch({
        effects: inputModeCompartment.reconfigure(emacs())
      })
    } else {
      this._instance.dispatch({
        effects: inputModeCompartment.reconfigure([])
      })
    }
  }
}
```

### 1.5 Configuration System in 3.6.0

**Config Template** (`source/app/service-providers/config/get-config-template.ts`):
```typescript
export interface ConfigOptions {
  editor: {
    inputMode: 'default'|'vim'|'emacs'
    autoSave: 'off'|'immediately'|'delayed'
    fontSize: number
    indentUnit: number
    // ... other settings
    // NOTE: vimFixedKeyboardLayout does NOT exist yet
  }
}
```

**Adding New Config Settings** (what you'll need to do):
1. Add property to `ConfigOptions` interface in `get-config-template.ts`
2. Add default value in `getConfigTemplate()` function
3. Update TypeScript types if needed
4. Config automatically available via `window.config.get('editor.vimFixedKeyboardLayout')`

**Preferences UI** (`source/win-preferences/schema/editor.ts`):
```typescript
export function getEditorFields(config: ConfigOptions): PreferencesFieldset[] {
  return [
    {
      title: trans('Input mode'),
      group: PreferencesGroups.Editor,
      titleField: {
        type: 'select',
        model: 'editor.inputMode',
        options: {
          default: 'Normal',
          emacs: 'Emacs',
          vim: 'Vim'
        }
      },
      fields: [/* ... */]
    },
    // Add your checkbox here for vimFixedKeyboardLayout
  ]
}
```

### 1.6 RTL Support Status in 3.6.0

**Current State**:
- ❌ **RTL settings removed** from config (no `editor.direction` or `editor.rtlMoveVisually`)
- ⚠️ **Placeholder exists** in preferences UI (lines 44-54 of `editor.ts`):
  ```typescript
  {
    title: trans('Writing direction'),
    group: PreferencesGroups.Editor,
    fields: [
      {
        type: 'form-text',
        display: 'info',
        contents: 'We are currently planning on re-introducing bidirectional writing support, which will then be configurable here.'
      }
    ]
  }
  ```

**Git History Investigation**:
```bash
# Recent RTL-related commits found:
987f5260e - fix(editor): Correctly switch RTL behaviour
d32dd4bc0 - Re-add direction setting to MarkdownEditor
73e556174 - Fiddling with RTL support
397e01bf0 - Added RTL support, closes #656
```

**Analysis**: RTL support existed but was removed or not fully migrated to CM6. The placeholder indicates plans to re-add it.

**CodeMirror 6 RTL Capabilities**:
- ✅ CM6 has **better RTL support** than CM5 (deployed on Hebrew Wikipedia)
- ✅ Supports RTL via `direction: rtl` CSS property
- ✅ EditorView.direction: StateEffect for dynamic direction switching
- ⚠️ **Unknown**: Whether RTL + Vim mode cursor positioning works correctly

---

## 2. Implementation Approaches Evaluation

### Approach A: DOM-Level Event Interception (Your Current 2.3.0 Method)

**How it Works**:
```typescript
// Attach to editor's input field with capture phase
const inputField = view.contentDOM  // CM6 equivalent
inputField.addEventListener('keydown', (event: KeyboardEvent) => {
  // Only in Normal/Visual mode
  if (mode !== 'normal' && mode !== 'visual') return

  // Map physical key to Vim command
  const vimCommand = getVimCommandForPhysicalKey(event.code, event.shiftKey)

  if (vimCommand !== null) {
    event.preventDefault()
    event.stopImmediatePropagation()

    // Trigger Vim command via getCM() compatibility layer
    const cm5 = getCM(view)
    Vim.handleKey(cm5, vimCommand, 'user')
  }
}, true)  // CAPTURE PHASE
```

**Pros**:
- ✅ **Proven approach** - works perfectly in 2.3.0
- ✅ **Physical key mapping** - independent of keyboard layout
- ✅ **Full control** - intercepts before CM6 processes keys
- ✅ **Shift key support** - handles I, A, O, $, ^, etc.
- ✅ **No Vim.map pollution** - doesn't affect Vim's global state

**Cons**:
- ⚠️ **Requires mode tracking** - must detect Normal/Visual/Insert modes
- ⚠️ **Lower-level** - bypasses CM6's event system
- ⚠️ **Maintenance** - may break if CM6 changes input handling

**Compatibility with CM6**:
- ✅ `view.contentDOM` provides access to input element
- ✅ `getCM(view)` provides CM5 compatibility layer
- ✅ `Vim.handleKey(cm5, key)` works with compatibility layer
- ⚠️ **Mode detection** requires accessing Vim state (see below)

**Mode Tracking in CM6**:
```typescript
import { getCM } from '@replit/codemirror-vim'

function getVimMode(view: EditorView): string {
  const cm5 = getCM(view)
  const vimState = (cm5 as any).state.vim
  return vimState?.mode || 'normal'  // 'normal', 'insert', 'visual', 'replace'
}
```

**Verdict**: ✅ **FEASIBLE** - Can be adapted to CM6 with minor modifications

---

### Approach B: Vim.map() API (Pure Vim Remapping)

**How it Works**:
```typescript
// In vimPlugin() function
export function vimPlugin(): Extension {
  // Map Arabic keys to English equivalents (example)
  Vim.map('ت', 'j', 'normal')  // Arabic teh → j (down)
  Vim.map('ن', 'k', 'normal')  // Arabic noon → k (up)
  Vim.map('م', 'l', 'normal')  // Arabic meem → l (right)
  Vim.map('ا', 'h', 'normal')  // Arabic alef → h (left)
  // ... 50+ more mappings

  // Shift key mappings
  Vim.map('ت', 'J', 'normal')  // Shift+teh → J (join lines)
  // ... etc.

  return [vim()]
}
```

**Pros**:
- ✅ **Native integration** - uses Vim's own mapping system
- ✅ **Simple implementation** - just Vim.map() calls
- ✅ **No low-level hacking** - stays within CM6's architecture
- ✅ **No mode tracking needed** - Vim handles it internally

**Cons**:
- ❌ **Character-level mapping** - maps 'ت' → 'j', not KeyJ → 'j'
- ❌ **Requires knowing keyboard layout** - need Arabic/Hebrew/etc. mappings
- ❌ **Shift key complications** - 'Shift+ت' may produce different character
- ❌ **Global pollution** - affects all editor instances
- ❌ **50+ Vim.map() calls** - clutters vimPlugin() function
- ❌ **Not configurable** - mappings are hardcoded

**Example Problem**:
```typescript
// User types KeyJ with Arabic keyboard
// Browser generates: key='ت', code='KeyJ'

// With Vim.map('ت', 'j'):
// ✓ Vim sees 'ت', maps to 'j', moves down

// But what if user types Shift+KeyJ?
// Browser generates: key='ة' (different character!), code='KeyJ'
// Vim.map('ت', 'J') won't work because key is 'ة', not 'ت'
```

**Verdict**: ⚠️ **WORKABLE BUT LIMITED** - Simple cases work, shift keys problematic

---

### Approach C: CM6 Extension with High-Precedence Keymap

**How it Works**:
```typescript
import { keymap, type KeyBinding } from '@codemirror/view'

function vimFixedKeyboardExtension(): Extension {
  const customKeymap: KeyBinding[] = [
    {
      key: 'h',  // Physical key H (but CM6 keymaps use character-level)
      run: (view) => {
        if (getVimMode(view) !== 'normal') return false
        const cm5 = getCM(view)
        Vim.handleKey(cm5, 'h', 'user')
        return true  // Prevent default
      }
    },
    // ... 50+ more bindings
  ]

  return keymap.of(customKeymap)
}
```

**Pros**:
- ✅ **CM6-native** - uses official keymap system
- ✅ **Precedence control** - can run before Vim extension
- ✅ **Per-instance** - doesn't pollute global Vim state

**Cons**:
- ❌ **Character-level keys** - CM6 keymaps use `key` property, not `code`
- ❌ **Same issue as Approach B** - can't map physical keys
- ❌ **Complex** - requires understanding CM6 keymap precedence
- ❌ **Mode tracking** - still need to check Vim mode

**CM6 Keymap Limitation**:
```typescript
// CM6 KeyBinding interface:
interface KeyBinding {
  key: string           // Uses event.key (character), NOT event.code (physical)
  run: (view) => boolean
  shift?: boolean
  // ...
}

// This won't work for non-Latin keyboards:
{ key: 'h', run: moveLeft }  // Only triggers on 'h' character, not KeyH physical key
```

**Verdict**: ❌ **NOT SUITABLE** - CM6 keymaps can't map physical keys

---

### Approach D: HYBRID (Recommended)

**Combines the strengths of Approach A and B**:

1. **Primary Method**: DOM event interception (Approach A)
   - Intercept at capture phase
   - Map physical keys to Vim commands
   - Works for all cases including shift keys

2. **Fallback/Enhancement**: Vim.map() for common cases (Approach B)
   - Add basic mappings for h/j/k/l
   - Provides redundancy if DOM interception fails
   - Helps users who don't enable the feature

**Implementation**:
```typescript
// 1. In vimPlugin() - add basic Vim.map() for common keys
export function vimPlugin(): Extension {
  // Existing mappings
  Vim.map('j', 'gj')
  Vim.map('k', 'gk')

  // Optional: Add basic Arabic/Hebrew mappings if config enabled
  // (Checked at plugin creation time)
  if (shouldEnableFixedKeyboard()) {
    Vim.map('ت', 'j', 'normal')  // Arabic
    Vim.map('ن', 'k', 'normal')
    // ... basic mappings only
  }

  return [vim()]
}

// 2. Create separate extension for DOM interception
export function vimFixedKeyboardExtension(view: EditorView): Extension {
  return EditorView.domEventHandlers({
    keydown(event: KeyboardEvent, view: EditorView): boolean {
      // Full implementation with physical key mapping
      // Only active in Normal/Visual mode
      // Handles all 50+ commands including shift keys
    }
  })
}

// 3. Conditionally add to extension set
function getCoreExtensions(options: CoreExtensionOptions): Extension[] {
  const inputMode: Extension[] = []
  if (options.initialConfig.inputMode === 'vim') {
    inputMode.push(vimPlugin())

    // Add fixed keyboard if enabled
    if (options.initialConfig.vimFixedKeyboardLayout) {
      inputMode.push(vimFixedKeyboardExtension(view))
    }
  }

  return [inputModeCompartment.of(inputMode), /* ... */]
}
```

**Pros**:
- ✅ **Best of both worlds**
- ✅ **Robust** - DOM interception handles edge cases
- ✅ **Graceful degradation** - Vim.map() provides fallback
- ✅ **Configurable** - feature can be toggled
- ✅ **CM6-friendly** - uses extension composition

**Cons**:
- ⚠️ **More complex** - two implementation paths
- ⚠️ **Potential conflicts** - must ensure Vim.map() doesn't interfere

**Verdict**: ✅ **RECOMMENDED** - Provides best user experience and maintainability

---

## 3. Incremental Migration Plan

### Phase 1: Environment Setup & Architecture Familiarization (2-3 days)

**Goals**:
- ✅ Build and run Zettlr 3.6.0 locally
- ✅ Understand CM6 extension architecture
- ✅ Test existing Vim mode functionality
- ✅ Verify build toolchain

**Tasks**:
1. **Clone and build Zettlr 3.6.0**:
   ```bash
   cd /Users/orwa/repos/Zettlr-official
   yarn install --frozen-lockfile
   yarn start  # Development mode
   ```

2. **Test existing Vim mode**:
   - Enable Vim mode in preferences
   - Test basic navigation (h, j, k, l)
   - Test insert mode (i, a, o)
   - Test visual mode (v, V)
   - Document any issues

3. **Explore codebase**:
   - Read `/source/common/modules/markdown-editor/index.ts`
   - Read `/source/common/modules/markdown-editor/plugins/vim-mode.ts`
   - Read `/source/common/modules/markdown-editor/editor-extension-sets.ts`
   - Understand extension composition pattern

4. **Test @replit/codemirror-vim APIs**:
   - Create test file to experiment with Vim.map()
   - Test getCM() compatibility layer
   - Test Vim.handleKey() function
   - Document findings

**Testing Checkpoint**:
- [ ] Zettlr 3.6.0 builds successfully
- [ ] Vim mode works for basic navigation
- [ ] You understand how extensions are composed
- [ ] You can call Vim API functions successfully

**Stop Conditions**:
- ❌ Build fails repeatedly → Investigate dependencies
- ❌ Vim mode doesn't work → Research known issues
- ❌ Can't access Vim API → Check @replit/codemirror-vim version

---

### Phase 2: Core Feature Implementation (1-2 weeks)

#### Phase 2A: Configuration Setup (1-2 days)

**Goals**:
- Add `vimFixedKeyboardLayout` config setting
- Add preferences UI checkbox
- Test config persistence and updates

**Tasks**:

1. **Add config property** (`source/app/service-providers/config/get-config-template.ts`):
   ```typescript
   export interface ConfigOptions {
     editor: {
       // ... existing properties
       inputMode: 'default'|'vim'|'emacs'
       vimFixedKeyboardLayout: boolean  // ADD THIS
     }
   }

   export function getConfigTemplate(): ConfigOptions {
     return {
       editor: {
         // ... existing defaults
         inputMode: 'default',
         vimFixedKeyboardLayout: false  // ADD THIS
       }
     }
   }
   ```

2. **Update TypeScript types** (if separate type file exists):
   - Check `source/types/main/config-provider.d.ts`
   - Add `vimFixedKeyboardLayout: boolean` if needed

3. **Add preferences UI** (`source/win-preferences/schema/editor.ts`):
   ```typescript
   {
     title: trans('Input mode'),
     group: PreferencesGroups.Editor,
     titleField: {
       type: 'select',
       model: 'editor.inputMode',
       options: {
         default: 'Normal',
         emacs: 'Emacs',
         vim: 'Vim'
       }
     },
     fields: [
       {
         type: 'form-text',
         display: 'info',
         contents: trans('The input mode determines how you interact with the editor...')
       },
       // ADD THIS CHECKBOX:
       {
         type: 'checkbox',
         label: trans('Use fixed keyboard layout for Vim Normal mode'),
         model: 'editor.vimFixedKeyboardLayout',
         // Only show when Vim mode is selected
         // (TODO: Check if conditional rendering exists in schema)
       }
     ]
   }
   ```

4. **Add translation key** (if translations are in separate files):
   - Add 'Use fixed keyboard layout for Vim Normal mode' to translation strings
   - Update Arabic translations if available

**Testing Checkpoint**:
- [ ] Config option appears in preferences UI
- [ ] Checkbox only shows when Vim mode is selected (if conditional rendering works)
- [ ] Toggling checkbox updates config
- [ ] Config persists after restart
- [ ] `window.config.get('editor.vimFixedKeyboardLayout')` returns correct value

---

#### Phase 2B: Core Keyboard Mapping Module (2-3 days)

**Goals**:
- Port `keyboard-layout-mapper.ts` to 3.6.0
- Keep exact same mapping logic
- Ensure TypeScript compiles

**Tasks**:

1. **Copy file**:
   ```bash
   cp /Users/orwa/repos/zettlr/source/common/modules/markdown-editor/keyboard-layout-mapper.ts \
      /Users/orwa/repos/Zettlr-official/source/common/modules/markdown-editor/keyboard-layout-mapper.ts
   ```

2. **Verify module works** (no changes needed unless TypeScript complains):
   - Check that `PHYSICAL_KEY_TO_VIM_COMMAND` exports correctly
   - Check that `SHIFT_COMMAND_MAP` exports correctly
   - Check that `getVimCommandForPhysicalKey()` function signature is correct

3. **Write unit tests** (optional but recommended):
   ```typescript
   // test/keyboard-layout-mapper.spec.ts
   import { getVimCommandForPhysicalKey } from '../source/common/modules/markdown-editor/keyboard-layout-mapper'

   describe('keyboard-layout-mapper', () => {
     it('maps basic navigation keys', () => {
       expect(getVimCommandForPhysicalKey('KeyH', false)).toBe('h')
       expect(getVimCommandForPhysicalKey('KeyJ', false)).toBe('j')
     })

     it('maps shift keys correctly', () => {
       expect(getVimCommandForPhysicalKey('KeyI', true)).toBe('I')
       expect(getVimCommandForPhysicalKey('KeyA', true)).toBe('A')
     })
   })
   ```

**Testing Checkpoint**:
- [ ] Module compiles without errors
- [ ] Exports are accessible
- [ ] Unit tests pass (if written)

---

#### Phase 2C: Vim Fixed Keyboard Extension (3-5 days)

**Goals**:
- Create CM6 extension for keyboard interception
- Integrate with Vim mode detection
- Handle mode changes correctly

**Tasks**:

1. **Create new file**: `source/common/modules/markdown-editor/plugins/vim-fixed-keyboard.ts`

2. **Implement extension**:

```typescript
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Vim Fixed Keyboard Extension
 * CVM-Role:        Extension
 * Maintainer:      Orwa Diraneyya
 * License:         GNU GPL v3
 *
 * Description:     CodeMirror 6 extension that enables fixed keyboard layout
 *                  for Vim Normal mode. Intercepts keydown events and remaps
 *                  physical key codes to Vim commands, allowing non-English
 *                  keyboards to use Vim navigation without switching layouts.
 *
 * END HEADER
 */

import { EditorView } from '@codemirror/view'
import { Extension } from '@codemirror/state'
import { getCM, Vim } from '@replit/codemirror-vim'
import { getVimCommandForPhysicalKey } from '../keyboard-layout-mapper'

/**
 * Gets the current Vim mode from the editor view
 */
function getVimMode(view: EditorView): string {
  try {
    const cm5 = getCM(view)
    const vimState = (cm5 as any).state?.vim
    return vimState?.mode || 'normal'
  } catch (err) {
    console.error('[Vim Fixed Keyboard] Could not get Vim mode:', err)
    return 'normal'
  }
}

/**
 * Creates the Vim fixed keyboard extension.
 *
 * This extension intercepts keyboard events at the DOM level and remaps
 * physical key codes to their Vim command equivalents. It only operates
 * in Normal and Visual modes, allowing Insert mode to type naturally.
 */
export function vimFixedKeyboard(): Extension {
  // We need to track whether we're currently processing a key to prevent
  // infinite recursion when Vim.handleKey() triggers new events
  let isProcessing = false

  return EditorView.domEventHandlers({
    keydown(event: KeyboardEvent, view: EditorView): boolean {
      // Prevent re-entry
      if (isProcessing) {
        return false
      }

      // Get current Vim mode
      const mode = getVimMode(view)

      // Only process in Normal and Visual modes
      if (mode !== 'normal' && mode !== 'visual') {
        return false
      }

      // Don't intercept modifier combinations (Ctrl+F, Alt+X, etc.)
      if (event.ctrlKey || event.altKey || event.metaKey) {
        return false
      }

      // Don't intercept special keys (Escape, Enter, arrows, etc.)
      const specialKeys = [
        'Escape', 'Enter', 'Tab', 'Backspace', 'Delete',
        'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
        'Home', 'End', 'PageUp', 'PageDown'
      ]
      if (specialKeys.includes(event.key)) {
        return false
      }

      // Map physical key to Vim command
      const vimCommand = getVimCommandForPhysicalKey(event.code, event.shiftKey)

      if (vimCommand !== null) {
        // Prevent default browser and CodeMirror handling
        event.preventDefault()
        event.stopPropagation()

        // Set processing flag
        isProcessing = true

        try {
          // Get CM5 compatibility layer and trigger Vim command
          const cm5 = getCM(view)
          Vim.handleKey(cm5, vimCommand, 'user')
        } catch (err) {
          console.error('[Vim Fixed Keyboard] Error handling key:', err)
        } finally {
          // Always clear the processing flag
          isProcessing = false
        }

        // Return true to indicate we handled the event
        return true
      }

      // Let other handlers process this key
      return false
    }
  })
}
```

3. **Integrate into vim-mode plugin** (`plugins/vim-mode.ts`):

```typescript
import type { Extension } from '@codemirror/state'
import { vim, Vim } from '@replit/codemirror-vim'
import { vimFixedKeyboard } from './vim-fixed-keyboard'
import { configField } from '../util/configuration'

// ... existing code ...

/**
 * Returns the Vim plugin extension, optionally including fixed keyboard support
 */
export function vimPlugin(): Extension {
  // Set up custom Ex commands
  Vim.defineEx('quit', 'q', quit)
  Vim.defineEx('write', 'w', write)
  Vim.defineEx('wq', 'wq', writeAndQuit)

  // Remap movement keys
  Vim.map('j', 'gj')
  Vim.map('k', 'gk')

  // Unmap conflicting bindings
  Vim.unmap('<C-f>')
  Vim.unmap('<C-t>', 'insert')
  Vim.unmap('<C-c>', 'insert')

  // Base extension
  const extensions: Extension[] = [vim()]

  // IMPORTANT: Fixed keyboard extension must be checked at runtime
  // because it depends on config, which may change dynamically
  // We'll handle this in editor-extension-sets.ts instead

  return extensions
}
```

4. **Update extension sets** (`editor-extension-sets.ts`):

```typescript
function getCoreExtensions(options: CoreExtensionOptions): Extension[] {
  const inputMode: Extension[] = []

  if (options.initialConfig.inputMode === 'vim') {
    inputMode.push(vimPlugin())

    // Add fixed keyboard extension if enabled
    if (options.initialConfig.vimFixedKeyboardLayout) {
      inputMode.push(vimFixedKeyboard())
    }
  } else if (options.initialConfig.inputMode === 'emacs') {
    inputMode.push(emacs())
  }

  return [
    inputModeCompartment.of(inputMode),
    // ... rest of extensions
  ]
}
```

5. **Handle dynamic config changes** (`index.ts`):

```typescript
private onConfigUpdate(newOptions: Partial<EditorConfiguration>): void {
  const inputModeChanged = newOptions.inputMode !== undefined &&
                           newOptions.inputMode !== this.config.inputMode
  const fixedKeyboardChanged = newOptions.vimFixedKeyboardLayout !== undefined &&
                               newOptions.vimFixedKeyboardLayout !== this.config.vimFixedKeyboardLayout

  // Reconfigure if input mode or fixed keyboard setting changed
  if (inputModeChanged || fixedKeyboardChanged) {
    const mode = newOptions.inputMode ?? this.config.inputMode

    if (mode === 'vim') {
      const extensions: Extension[] = [vimPlugin()]

      // Add fixed keyboard if enabled in new or existing config
      const fixedKeyboardEnabled = newOptions.vimFixedKeyboardLayout ??
                                   this.config.vimFixedKeyboardLayout
      if (fixedKeyboardEnabled) {
        extensions.push(vimFixedKeyboard())
      }

      this._instance.dispatch({
        effects: inputModeCompartment.reconfigure(extensions)
      })
    } else if (mode === 'emacs') {
      this._instance.dispatch({
        effects: inputModeCompartment.reconfigure(emacs())
      })
    } else {
      this._instance.dispatch({
        effects: inputModeCompartment.reconfigure([])
      })
    }
  }

  // ... rest of config updates
}
```

**Testing Checkpoint**:
- [ ] Extension compiles without errors
- [ ] Vim mode still works without fixed keyboard enabled
- [ ] With fixed keyboard enabled + Arabic keyboard:
  - [ ] Physical H key moves cursor left (h command)
  - [ ] Physical J key moves cursor down (j command)
  - [ ] Physical K key moves cursor up (k command)
  - [ ] Physical L key moves cursor right (l command)
- [ ] Insert mode typing works normally (Arabic characters appear)
- [ ] Shift keys work (Shift+A → 'A' command, not 'a')
- [ ] Toggling config updates behavior without restart

**Stop Conditions**:
- ❌ Keys not intercepted → Check domEventHandlers registration
- ❌ Mode detection fails → Debug getVimMode() function
- ❌ Vim.handleKey() doesn't work → Check getCM() compatibility
- ❌ Infinite loop → Check isProcessing guard logic

---

### Phase 3: RTL Support Re-introduction (3-5 days)

**Goals**:
- Add RTL direction configuration
- Implement CSS direction switching
- Test RTL + Vim cursor positioning
- Document any limitations

**Tasks**:

#### Phase 3A: RTL Configuration (1 day)

1. **Add config properties** (`get-config-template.ts`):
   ```typescript
   export interface ConfigOptions {
     editor: {
       // ... existing properties
       direction: 'ltr'|'rtl'
       // Optional: rtlMoveVisually setting (if needed for cursor behavior)
     }
   }

   export function getConfigTemplate(): ConfigOptions {
     return {
       editor: {
         // ... existing defaults
         direction: 'ltr'  // Default to left-to-right
       }
     }
   }
   ```

2. **Update preferences UI** (`schema/editor.ts`):
   ```typescript
   {
     title: trans('Writing direction'),
     group: PreferencesGroups.Editor,
     help: undefined,
     fields: [
       // REPLACE PLACEHOLDER WITH:
       {
         type: 'radio',
         model: 'editor.direction',
         options: {
           'ltr': trans('Left-to-right (LTR)'),
           'rtl': trans('Right-to-left (RTL)')
         }
       },
       {
         type: 'form-text',
         display: 'info',
         contents: trans('Set the text direction for the editor. Choose RTL for languages like Arabic, Hebrew, or Persian.')
       }
     ]
   }
   ```

#### Phase 3B: RTL Implementation (2-3 days)

**Strategy 1: CSS-Based Direction** (Recommended for simplicity)

```typescript
// In editor-extension-sets.ts or a new plugin
function rtlSupport(): Extension {
  return EditorView.updateListener.of((update) => {
    const config = update.state.field(configField, false)
    if (config) {
      const direction = config.direction || 'ltr'
      update.view.contentDOM.style.direction = direction
      update.view.contentDOM.dir = direction  // Set HTML dir attribute
    }
  })
}

// Add to getMarkdownExtensions():
export function getMarkdownExtensions(options: CoreExtensionOptions): Extension[] {
  return [
    // ... existing extensions
    rtlSupport()
  ]
}
```

**Strategy 2: EditorView.editorAttributes** (More CM6-native)

```typescript
import { EditorView } from '@codemirror/view'

function rtlSupport(): Extension {
  return EditorView.editorAttributes.from(configField, (config) => {
    return {
      dir: config.direction || 'ltr',
      style: `direction: ${config.direction || 'ltr'};`
    }
  })
}
```

**Strategy 3: StateEffect-based switching** (Most dynamic)

```typescript
import { StateEffect, StateField } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

// Define effect
export const directionEffect = StateEffect.define<'ltr'|'rtl'>()

// Define field
export const directionField = StateField.define<'ltr'|'rtl'>({
  create: () => 'ltr',
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(directionEffect)) {
        return effect.value
      }
    }
    return value
  },
  provide: field => EditorView.editorAttributes.from(field, dir => ({
    dir,
    style: `direction: ${dir};`
  }))
})

// Dispatch direction change:
view.dispatch({ effects: directionEffect.of('rtl') })
```

**Recommendation**: Start with **Strategy 1** (CSS-based) for simplicity. If it works with Vim cursor positioning, stick with it. If not, investigate Strategy 2 or 3.

#### Phase 3C: RTL + Vim Testing (1-2 days)

**Critical Test Cases**:

1. **Basic Cursor Movement**:
   - Create document with Arabic text
   - Set direction to RTL
   - Enable Vim mode
   - Test: `h` (should move right in RTL context - "backward" in text)
   - Test: `l` (should move left in RTL context - "forward" in text)
   - Test: `j` (down), `k` (up) - should work normally
   - **Expected**: Cursor moves logically, not visually

2. **Line End/Start Commands**:
   - Test: `0` (beginning of line) - cursor should be at visual RIGHT side
   - Test: `$` (end of line) - cursor should be at visual LEFT side
   - Test: `^` (first non-blank) - cursor should be at correct position
   - Test: `A` (append at end) - should place cursor at visual left
   - Test: `I` (insert at start) - should place cursor at visual right
   - **Expected**: Commands work correctly with RTL layout

3. **Word Movement**:
   - Test: `w` (word forward) - should move right-to-left in RTL text
   - Test: `b` (word backward) - should move left-to-right in RTL text
   - Test: `e` (end of word)
   - **Expected**: Logical word boundaries respected

4. **Visual Mode**:
   - Test: `v` then `l` - should select right-to-left
   - Test: `v` then `h` - should select left-to-right
   - Test: `V` (visual line)
   - **Expected**: Selection works correctly

5. **Delete/Change Operations**:
   - Test: `dw` (delete word) - should delete next word (visual right)
   - Test: `db` (delete back word) - should delete previous word (visual left)
   - Test: `d$` (delete to end) - should delete to visual left
   - Test: `d0` (delete to start) - should delete to visual right
   - **Expected**: Deletions work correctly

**If RTL Cursor Issues Occur**:

6. **Investigate CM6 Bidi Support**:
   - Check if CM6 has bidi-related configuration
   - Look for direction-aware cursor positioning APIs
   - Research Hebrew Wikipedia's CM6 implementation

7. **Workaround Options** (if native support insufficient):
   - Custom cursor positioning plugin
   - Override Vim motion commands for RTL
   - Contact CM6/Replit Vim maintainers

**Testing Checkpoint**:
- [ ] RTL text displays correctly (right-aligned)
- [ ] Cursor appears at correct position
- [ ] All 5 test case categories pass
- [ ] No visual glitches when switching LTR ↔ RTL
- [ ] Vim commands work logically (not visually)

**Stop Conditions**:
- ❌ Cursor positioning broken → Try different CSS approaches
- ❌ Vim commands don't work in RTL → May need to file bug report or implement workarounds
- ❌ Visual glitches → Investigate CM6 theme/styling issues

---

### Phase 4: Arabic Translations & Polishing (1-2 days)

**Goals**:
- Update Arabic translations for new UI strings
- Test UI in Arabic
- Final bug fixes

**Tasks**:

1. **Check existing Arabic translations**:
   ```bash
   cat /Users/orwa/repos/Zettlr-official/static/lang/ar-AR.po | grep -A 2 "Input mode"
   ```

2. **Add new translation strings**:
   - 'Use fixed keyboard layout for Vim Normal mode'
   - 'Set the text direction for the editor...' (RTL help text)
   - Any other new UI strings

3. **Compare with 2.3.0 translations**:
   ```bash
   # Your 2.3.0 fork has ar-AR.json
   cat /Users/orwa/repos/zettlr/static/lang/ar-AR.json | jq .
   ```

4. **Port missing translations**:
   - Identify strings in 2.3.0 that don't exist in 3.6.0
   - Add to ar-AR.po in 3.6.0
   - Follow PO file format

5. **Test UI in Arabic**:
   - Change app language to Arabic
   - Navigate to preferences
   - Verify all strings display correctly
   - Check for layout issues (text overflow, alignment)

**Testing Checkpoint**:
- [ ] All UI strings translated
- [ ] No English fallback strings in Arabic mode
- [ ] Preferences UI looks correct in Arabic
- [ ] RTL UI direction works (if applicable)

---

## 4. RTL Support Strategy

### 4.1 Understanding the Problem

**The Challenge**: In RTL languages like Arabic, text flows right-to-left, but Vim's cursor positioning and motion commands were designed for LTR text. This creates confusion:

| Command | LTR Behavior | RTL Visual Position | Expected Logical Behavior |
|---------|--------------|---------------------|---------------------------|
| `h` | Move left | Move right | Move "backward" (visually right) |
| `l` | Move right | Move left | Move "forward" (visually left) |
| `$` | End of line | Visual right | Visual left (RTL line end) |
| `0` | Start of line | Visual left | Visual right (RTL line start) |

**CodeMirror 5 Issue**: CM5 Vim mode had **hardcoded LTR assumptions** in cursor positioning that could never be fixed (acknowledged by maintainer).

**CodeMirror 6 Promise**: CM6 has **better RTL support** (deployed on Hebrew Wikipedia), but it's unclear if Vim mode works correctly in RTL.

### 4.2 Implementation Strategy

**Step 1: Test Native CM6 RTL + Vim Support First**

Before implementing workarounds, test if CM6 + @replit/codemirror-vim handle RTL correctly out-of-the-box:

```typescript
// Minimal test implementation
const testRTL = () => {
  // 1. Set CSS direction
  view.contentDOM.style.direction = 'rtl'
  view.contentDOM.dir = 'rtl'

  // 2. Insert Arabic text
  view.dispatch({
    changes: { from: 0, insert: 'مرحبا بك في محرر زتلر' }
  })

  // 3. Enable Vim mode and test commands
  // ... see test cases in Phase 3C
}
```

**Outcome Possibilities**:
- ✅ **Best case**: Everything works! Ship it.
- ⚠️ **Partial success**: Some commands work, others don't → Implement targeted fixes
- ❌ **Failure**: Cursor positioning completely broken → Need comprehensive solution

**Step 2: Implement CSS-Based Direction Switching**

```typescript
// Simple extension to control direction
export function rtlSupport(): Extension {
  return [
    // Set direction attribute
    EditorView.editorAttributes.from(configField, (config) => ({
      dir: config.direction || 'ltr'
    })),

    // Apply CSS direction
    EditorView.theme({
      '&[dir="rtl"]': {
        direction: 'rtl !important',
        textAlign: 'right'
      },
      '&[dir="ltr"]': {
        direction: 'ltr !important',
        textAlign: 'left'
      }
    })
  ]
}
```

**Step 3: Monitor and Document Issues**

If cursor issues occur:

1. **Document specific failing commands**:
   - Which commands work correctly?
   - Which commands have wrong cursor position?
   - Is the issue consistent or intermittent?

2. **Check CM6 and @replit/codemirror-vim issue trackers**:
   - Search for "RTL", "bidi", "bidirectional"
   - Look for existing bug reports or feature requests

3. **Consult with upstream maintainers**:
   - File detailed bug report if issue is in CM6 or @replit/codemirror-vim
   - Provide test cases and examples

**Step 4: Implement Workarounds (If Needed)**

If native support is insufficient, consider:

**Option A: Custom Vim Motion Overrides**
```typescript
// Override Vim motions to account for RTL
if (config.direction === 'rtl') {
  // Swap h/l behavior
  Vim.map('h', 'l')  // h moves right (forward in RTL)
  Vim.map('l', 'h')  // l moves left (backward in RTL)

  // This is crude but may work for basic cases
}
```

**Option B: Custom Cursor Positioning Plugin**
```typescript
// Monitor cursor position and adjust for RTL
EditorView.updateListener.of((update) => {
  if (update.selectionSet && config.direction === 'rtl') {
    // Adjust cursor position based on RTL context
    // (Complex, requires deep understanding of CM6 internals)
  }
})
```

**Option C: Wait for Upstream Fix**
If the issue is in CM6/Replit Vim, document the limitation and wait for fix. Provide workarounds in docs (e.g., "RTL cursor positioning has known issues in Vim mode").

### 4.3 User Documentation

Regardless of outcome, document RTL + Vim behavior:

**If it works**:
```markdown
## RTL Support with Vim Mode

Zettlr supports right-to-left text direction for languages like Arabic, Hebrew, and Persian. When using Vim mode with RTL text:

- Cursor positioning works correctly
- `h`/`l` commands move logically (backward/forward in text)
- `$`/`0` commands go to logical line end/start
- All Vim motions respect RTL text flow

To enable RTL:
1. Go to Preferences → Editor → Writing Direction
2. Select "Right-to-left (RTL)"
```

**If it doesn't work**:
```markdown
## Known Limitations: RTL + Vim Mode

⚠️ **Note**: Cursor positioning in Vim mode with RTL text has known issues. We're working with CodeMirror maintainers to address this.

**Workarounds**:
- Use Normal input mode (not Vim) for RTL text
- Switch keyboard layout instead of using fixed keyboard feature
- Use visual indicators to track cursor position

**What doesn't work**:
- [List specific failing commands]

**Tracking**: See issue #XXXX for updates
```

---

## 5. Risk Assessment & Mitigation

### Risk 1: CodeMirror 6 Architecture Changes Break Feature

**Probability**: Medium
**Impact**: High
**Risk Level**: 🔴 HIGH

**Description**: CM6's event handling or Vim integration changes could make DOM interception approach non-viable.

**Indicators**:
- `domEventHandlers` doesn't intercept keys as expected
- `getCM()` compatibility layer is unstable
- `Vim.handleKey()` doesn't work correctly

**Mitigation**:
1. **Test early** (Phase 1): Verify core assumptions about CM6 APIs
2. **Have fallback** (Approach B): Vim.map() can provide basic functionality
3. **Monitor upstream**: Watch @replit/codemirror-vim release notes
4. **Engage community**: Ask questions on CM6 discuss forum early

**Contingency Plan**:
If DOM interception fails, fall back to pure Vim.map() approach (Approach B) with documentation about shift key limitations.

---

### Risk 2: @replit/codemirror-vim API Incompatibility

**Probability**: Low
**Impact**: High
**Risk Level**: 🟡 MEDIUM

**Description**: Replit Vim's API may not match CM5 Vim exactly, breaking our assumptions.

**Indicators**:
- `Vim.map()` behaves differently
- `Vim.handleKey()` signature changed
- Mode detection doesn't work

**Mitigation**:
1. **Read @replit/codemirror-vim source code**: Understand how it differs from CM5
2. **Test incrementally**: Verify each API call works before building on it
3. **Contribute upstream**: If we find bugs, submit PRs to Replit

**Contingency Plan**:
Fork @replit/codemirror-vim if necessary, or implement our own minimal Vim mode wrapper.

---

### Risk 3: RTL + Vim Cursor Positioning Broken

**Probability**: High
**Impact**: High
**Risk Level**: 🔴 HIGH

**Description**: CM6 may have same RTL cursor issues as CM5, making Vim + RTL unusable.

**Indicators**:
- `$` command places cursor at wrong position in RTL text
- `A` (append) doesn't work at RTL line end
- Word motions go wrong direction

**Mitigation**:
1. **Test before implementing** (Phase 3): Validate RTL works BEFORE building feature
2. **Research CM6 bidi support**: Look for existing solutions or workarounds
3. **Consult Hebrew Wikipedia**: They use CM6, may have insights
4. **Have escape hatch**: Document limitation if unfixable

**Contingency Plan**:
If RTL + Vim doesn't work:
1. **Option A**: Ship feature without RTL support, document limitation
2. **Option B**: Implement RTL-only mode that disables Vim
3. **Option C**: Wait for upstream fix, delay RTL re-introduction

---

### Risk 4: Dynamic Config Changes Don't Work

**Probability**: Low
**Impact**: Medium
**Risk Level**: 🟢 LOW

**Description**: Toggling `vimFixedKeyboardLayout` may not update extensions without restart.

**Indicators**:
- Checkbox changes don't affect behavior
- `inputModeCompartment.reconfigure()` doesn't work
- Extensions not added/removed dynamically

**Mitigation**:
1. **Follow Zettlr patterns**: Study how other dynamic configs work (e.g., theme switching)
2. **Test early**: Verify reconfiguration works in Phase 2
3. **Worst case**: Require restart (document it)

**Contingency Plan**:
If dynamic switching fails, show warning: "Restart Zettlr to apply this setting."

---

### Risk 5: Vim.map() Global Pollution

**Probability**: Medium (if using Approach B)
**Impact**: Low
**Risk Level**: 🟢 LOW

**Description**: Vim.map() is global, so mappings affect all editor instances, even with feature disabled.

**Indicators**:
- Disabling feature doesn't remove mappings
- Mappings persist across editor instances
- Conflicts with user's own vimrc (if feature added later)

**Mitigation**:
1. **Prefer Approach A/D**: DOM interception is per-instance
2. **If using Vim.map()**: Only call if config enabled at startup
3. **Unmap on disable**: Call Vim.unmap() when feature disabled (may not work)

**Contingency Plan**:
Document that Vim.map() changes are global and persist until app restart.

---

### Risk 6: Performance Issues with Event Interception

**Probability**: Low
**Impact**: Medium
**Risk Level**: 🟢 LOW

**Description**: DOM event interception on every keydown could cause input lag.

**Indicators**:
- Typing feels sluggish
- Profiler shows keydown handler taking >5ms
- Users report "laggy" editor

**Mitigation**:
1. **Keep handler minimal**: Only check mode and map keys, no complex logic
2. **Early returns**: Exit quickly if not in Normal/Visual mode
3. **Profile early**: Test with large documents and fast typing

**Contingency Plan**:
Add debouncing or throttling if needed, though this may affect Vim responsiveness.

---

### Risk 7: Platform-Specific Issues

**Probability**: Medium
**Impact**: Medium
**Risk Level**: 🟡 MEDIUM

**Description**: Keyboard event handling may differ on Windows/Mac/Linux.

**Indicators**:
- Feature works on Mac but not Windows
- KeyboardEvent.code differs across platforms
- Browser differences (Electron Chromium version)

**Mitigation**:
1. **Test on all platforms**: Mac, Windows, Linux
2. **Use standard key codes**: Avoid platform-specific codes
3. **Fallback handling**: If code detection fails, fall back to key character

**Contingency Plan**:
Document platform limitations if differences are unavoidable.

---

## 6. Testing Strategy

### 6.1 Unit Tests

**File**: `test/keyboard-layout-mapper.spec.ts`

```typescript
import { describe, it } from 'mocha'
import { expect } from 'chai'
import { getVimCommandForPhysicalKey } from '../source/common/modules/markdown-editor/keyboard-layout-mapper'

describe('keyboard-layout-mapper', () => {
  describe('getVimCommandForPhysicalKey', () => {
    it('maps basic navigation keys without shift', () => {
      expect(getVimCommandForPhysicalKey('KeyH', false)).to.equal('h')
      expect(getVimCommandForPhysicalKey('KeyJ', false)).to.equal('j')
      expect(getVimCommandForPhysicalKey('KeyK', false)).to.equal('k')
      expect(getVimCommandForPhysicalKey('KeyL', false)).to.equal('l')
    })

    it('maps insert mode keys without shift', () => {
      expect(getVimCommandForPhysicalKey('KeyI', false)).to.equal('i')
      expect(getVimCommandForPhysicalKey('KeyA', false)).to.equal('a')
      expect(getVimCommandForPhysicalKey('KeyO', false)).to.equal('o')
    })

    it('maps shifted keys correctly', () => {
      expect(getVimCommandForPhysicalKey('KeyI', true)).to.equal('I')
      expect(getVimCommandForPhysicalKey('KeyA', true)).to.equal('A')
      expect(getVimCommandForPhysicalKey('KeyO', true)).to.equal('O')
      expect(getVimCommandForPhysicalKey('Digit4', true)).to.equal('$')
      expect(getVimCommandForPhysicalKey('Digit6', true)).to.equal('^')
    })

    it('returns null for unmapped keys', () => {
      expect(getVimCommandForPhysicalKey('KeyQ', false)).to.be.null
      expect(getVimCommandForPhysicalKey('Digit1', true)).to.be.null
    })

    it('maps word navigation', () => {
      expect(getVimCommandForPhysicalKey('KeyW', false)).to.equal('w')
      expect(getVimCommandForPhysicalKey('KeyB', false)).to.equal('b')
      expect(getVimCommandForPhysicalKey('KeyE', false)).to.equal('e')
    })
  })
})
```

**Run tests**:
```bash
cd /Users/orwa/repos/Zettlr-official
yarn test test/keyboard-layout-mapper.spec.ts
```

### 6.2 Integration Tests

**Manual Test Checklist** (Phase 2):

#### Basic Functionality
- [ ] Feature disabled by default
- [ ] Checkbox appears in preferences when Vim mode selected
- [ ] Enabling checkbox activates feature
- [ ] Disabling checkbox deactivates feature
- [ ] Feature state persists after restart

#### Keyboard Mapping (with Arabic keyboard active)
- [ ] **Navigation**: h/j/k/l commands work with physical keys
- [ ] **Insert modes**: i/a/o commands work with physical keys
- [ ] **Shifted insert**: I/A/O commands work with Shift+physical keys
- [ ] **Line commands**: 0/$/^ work with physical keys
- [ ] **Word motion**: w/b/e commands work
- [ ] **Delete**: d/x commands work
- [ ] **Change**: c/s commands work
- [ ] **Yank/paste**: y/p commands work
- [ ] **Visual mode**: v/V commands work
- [ ] **Search**: / and n/N commands work
- [ ] **Undo/redo**: u/Ctrl+R work

#### Mode Switching
- [ ] Insert mode allows typing Arabic normally
- [ ] ESC switches back to Normal mode
- [ ] Feature only active in Normal/Visual modes
- [ ] Feature inactive in Insert mode

#### Edge Cases
- [ ] Modifier keys (Ctrl+F, Alt+X) pass through normally
- [ ] Special keys (Escape, Enter, arrows) pass through normally
- [ ] Multiple editor instances work independently
- [ ] Switching between files works correctly
- [ ] Feature works with multiple cursors (if applicable)

#### Performance
- [ ] No noticeable input lag when typing fast
- [ ] No lag when switching modes
- [ ] Works smoothly with large documents (10,000+ lines)

### 6.3 RTL + Vim Tests (Phase 3)

**RTL Test Document** (create as test file):
```markdown
# مرحبا بك في زتلر

هذا مثال على نص عربي يستخدم لاختبار وضع فيم مع اتجاه الكتابة من اليمين إلى اليسار.

## اختبار التنقل

- البند الأول
- البند الثاني
- البند الثالث

الكلمات العربية تتدفق من اليمين إلى اليسار، ولكن الأوامر المنطقية يجب أن تعمل بشكل صحيح.

`كود مضمن` و**نص عريض** و*نص مائل*.
```

**Manual RTL Test Checklist**:

#### Cursor Positioning
- [ ] `0` command places cursor at visual right (RTL line start)
- [ ] `$` command places cursor at visual left (RTL line end)
- [ ] `^` command places cursor at first non-blank (visual right)
- [ ] `h` command moves cursor right (backward in RTL)
- [ ] `l` command moves cursor left (forward in RTL)
- [ ] `j` and `k` commands work normally

#### Insertion and Appending
- [ ] `i` command enters insert before cursor (correct position)
- [ ] `a` command enters insert after cursor (correct position)
- [ ] `I` command enters insert at line start (visual right)
- [ ] `A` command enters insert at line end (visual left)
- [ ] `o` command opens line below
- [ ] `O` command opens line above

#### Word Movement
- [ ] `w` command moves to next word (visual right-to-left)
- [ ] `b` command moves to previous word (visual left-to-right)
- [ ] `e` command moves to end of word

#### Deletion and Change
- [ ] `x` command deletes character under cursor
- [ ] `dw` command deletes to next word start
- [ ] `db` command deletes to previous word start
- [ ] `d$` command deletes to line end (visual left)
- [ ] `d0` command deletes to line start (visual right)
- [ ] `dd` command deletes entire line

#### Visual Mode
- [ ] `v` then `l` selects right-to-left (forward in RTL)
- [ ] `v` then `h` selects left-to-right (backward in RTL)
- [ ] `V` selects entire line
- [ ] Visual selection displays correctly

### 6.4 Cross-Platform Tests

**Test Matrix**:

| Platform | Keyboard | Test Result |
|----------|----------|-------------|
| macOS 14+ | Arabic | [ ] Pass / [ ] Fail |
| macOS 14+ | Hebrew | [ ] Pass / [ ] Fail |
| Windows 11 | Arabic | [ ] Pass / [ ] Fail |
| Windows 11 | Hebrew | [ ] Pass / [ ] Fail |
| Linux (Ubuntu 22.04) | Arabic | [ ] Pass / [ ] Fail |
| Linux (Ubuntu 22.04) | Hebrew | [ ] Pass / [ ] Fail |

**Platform-Specific Considerations**:
- **macOS**: Input source switching (Cmd+Space), keyboard layout detection
- **Windows**: IME handling, keyboard layout switching (Win+Space)
- **Linux**: X11 vs Wayland differences, various keyboard layout managers

### 6.5 Regression Tests

Ensure existing Zettlr features still work:

#### Editor Features
- [ ] Markdown rendering still works
- [ ] Autocomplete still works
- [ ] Spellcheck still works
- [ ] Search (Ctrl+F) still works
- [ ] Table editor still works

#### Vim Mode (without fixed keyboard)
- [ ] Standard Vim mode works with English keyboard
- [ ] Ex commands (:w, :q, :wq) still work
- [ ] Visual mode still works
- [ ] Emacs mode still works (if user switches)

#### General Application
- [ ] File opening/closing works
- [ ] Preferences saving works
- [ ] Other preference changes apply correctly

---

## 7. File-by-File Migration Checklist

### Files to Create (New in 3.6.0)

| File | Status | Description |
|------|--------|-------------|
| `source/common/modules/markdown-editor/keyboard-layout-mapper.ts` | [ ] Created | Port from 2.3.0 (minimal changes) |
| `source/common/modules/markdown-editor/plugins/vim-fixed-keyboard.ts` | [ ] Created | CM6 extension for keyboard interception |
| `test/keyboard-layout-mapper.spec.ts` | [ ] Created | Unit tests for keyboard mapper |

### Files to Modify (Existing in 3.6.0)

| File | Changes Required | Status |
|------|------------------|--------|
| `source/app/service-providers/config/get-config-template.ts` | Add `vimFixedKeyboardLayout` to ConfigOptions interface and default | [ ] Modified |
| `source/win-preferences/schema/editor.ts` | Add checkbox for vim fixed keyboard, update RTL placeholder | [ ] Modified |
| `source/common/modules/markdown-editor/plugins/vim-mode.ts` | Import and conditionally include vim-fixed-keyboard extension | [ ] Modified |
| `source/common/modules/markdown-editor/editor-extension-sets.ts` | Add vim-fixed-keyboard to extension composition logic | [ ] Modified |
| `source/common/modules/markdown-editor/index.ts` | Handle vimFixedKeyboardLayout config changes in onConfigUpdate() | [ ] Modified |
| `static/lang/ar-AR.po` | Add translations for new UI strings | [ ] Modified |

### Files to Reference (For Understanding)

| File | Purpose |
|------|---------|
| `source/common/modules/markdown-editor/index.ts` | Main MarkdownEditor class, understand extension loading |
| `source/common/modules/markdown-editor/util/configuration.ts` | Config field structure |
| `source/common/modules/markdown-editor/keymaps/default.ts` | Example of keymap structure |
| `source/common/modules/markdown-editor/plugins/typewriter.ts` | Example plugin for reference |
| `package.json` | Check @replit/codemirror-vim version |

### File Comparison: 2.3.0 vs 3.6.0

| Concept | 2.3.0 Location | 3.6.0 Location |
|---------|----------------|----------------|
| **Editor initialization** | `markdown-editor/index.ts` | `markdown-editor/index.ts` (same) |
| **Extension/plugin loading** | `markdown-editor/load-plugins.ts` | `markdown-editor/editor-extension-sets.ts` |
| **Hooks** | `markdown-editor/hooks/` | Replaced by extensions in `plugins/` |
| **Vim mode setup** | `load-plugins.ts` lines 34-40 | `plugins/vim-mode.ts` |
| **Config template** | `config/get-config-template.ts` | `config/get-config-template.ts` (same) |
| **Preferences UI** | `win-preferences/schema/editor.ts` | `win-preferences/schema/editor.ts` (same) |
| **Translations** | `static/lang/*.json` | `static/lang/*.po` (format change!) |

---

## 8. Architecture Decision Records

### ADR 1: Hybrid Implementation Approach (DOM + Vim.map)

**Status**: Recommended
**Date**: 2025-11-08

**Context**:
We need to map physical keyboard keys to Vim commands for non-English keyboards. Three approaches were evaluated: DOM interception, Vim.map(), and CM6 keymaps.

**Decision**:
Implement a **hybrid approach** using DOM event interception as the primary method, with optional Vim.map() as a fallback/enhancement.

**Rationale**:
- DOM interception provides full control and handles shift keys correctly
- Vim.map() offers simpler fallback for basic cases
- CM6 keymaps can't map physical keys (character-level only)
- Proven approach from 2.3.0 can be adapted to CM6

**Consequences**:
- More complex implementation (two code paths)
- Better user experience and robustness
- Easier to debug (can test each approach separately)

---

### ADR 2: CSS-Based RTL Direction Switching

**Status**: Recommended for initial implementation
**Date**: 2025-11-08

**Context**:
RTL support requires controlling text direction. CM6 offers multiple approaches: CSS properties, editorAttributes, or StateEffects.

**Decision**:
Start with **CSS-based direction switching** using `EditorView.editorAttributes`.

**Rationale**:
- Simplest implementation
- Standard HTML/CSS mechanism (`dir` attribute)
- Easy to understand and debug
- Can upgrade to StateEffect-based approach if needed

**Consequences**:
- May not handle all RTL + Vim edge cases
- Easy to test and validate
- Can be enhanced later if issues arise

---

### ADR 3: Configuration Changes Require Reconfiguration

**Status**: Recommended
**Date**: 2025-11-08

**Context**:
Users may toggle `vimFixedKeyboardLayout` or change `inputMode` without restarting. Extensions need to be added/removed dynamically.

**Decision**:
Use **Compartment reconfiguration** to dynamically add/remove vim-fixed-keyboard extension when config changes.

**Rationale**:
- Follows Zettlr's existing pattern (inputModeCompartment)
- Provides seamless user experience
- Avoids requiring restart

**Consequences**:
- More complex config update logic
- Must handle all combination scenarios (vim mode on/off, fixed keyboard on/off)
- Better user experience

---

## 9. Migration Phases Summary

### Phase Summary Table

| Phase | Duration | Deliverable | Testing Checkpoint |
|-------|----------|-------------|-------------------|
| **Phase 1**: Setup | 2-3 days | Working Zettlr 3.6.0 dev environment | Can build and run 3.6.0 |
| **Phase 2A**: Config | 1-2 days | vimFixedKeyboardLayout config + UI | Config persists and updates |
| **Phase 2B**: Mapper | 2-3 days | keyboard-layout-mapper.ts ported | Module compiles, unit tests pass |
| **Phase 2C**: Extension | 3-5 days | vim-fixed-keyboard extension working | Feature works with Arabic keyboard |
| **Phase 3A**: RTL Config | 1 day | RTL direction config + UI | RTL direction switches correctly |
| **Phase 3B**: RTL Impl | 2-3 days | RTL rendering working | RTL text displays correctly |
| **Phase 3C**: RTL+Vim Test | 1-2 days | RTL + Vim validated | All cursor commands work |
| **Phase 4**: Translations | 1-2 days | Arabic translations complete | UI fully translated |

**Total Estimated Time**: 2-4 weeks (depending on issues encountered)

### Stop/Go Decision Points

**After Phase 1**:
- ✅ **GO** if: Build works, Vim mode functional, APIs accessible
- ❌ **STOP** if: Can't build, major breaking changes in CM6

**After Phase 2B**:
- ✅ **GO** if: Keyboard mapper compiles and tests pass
- ❌ **REVIEW** if: TypeScript errors, refactor mapping logic

**After Phase 2C**:
- ✅ **GO** if: Basic h/j/k/l work with Arabic keyboard
- ❌ **STOP** if: DOM interception doesn't work, consider Approach B fallback

**After Phase 3C**:
- ✅ **GO** if: RTL cursor positioning works correctly
- ❌ **DOCUMENT LIMITATION** if: RTL + Vim broken, ship without RTL
- ⚠️ **ENGAGE UPSTREAM** if: Partial failure, file bug reports

---

## 10. Questions for User / Clarifications Needed

Before starting implementation, please confirm:

### Technical Decisions

1. **Approach Confirmation**: Do you agree with the **Hybrid approach** (DOM interception + Vim.map fallback), or prefer pure DOM interception?

2. **RTL Priority**: Is RTL support a **must-have** or **nice-to-have**? Should we:
   - Ship vim-fixed-keyboard without RTL if RTL+Vim doesn't work?
   - Wait to ship until RTL+Vim is validated?
   - Ship with documented RTL limitation?

3. **Testing Scope**: Do you have access to test on:
   - Windows 11?
   - Linux (Ubuntu/Fedora)?
   - Hebrew keyboard layout?

### Implementation Scope

4. **Translation Coverage**: Should we:
   - Only update Arabic (ar-AR)?
   - Add Hebrew (he-IL) translations if available?
   - Leave translations for later?

5. **Additional Keyboard Layouts**: Your 2.3.0 implementation focuses on Arabic. Should we also support:
   - Hebrew?
   - Persian/Farsi?
   - Russian (Cyrillic)?
   - Other layouts?

6. **Feature Discoverability**: Should we add any UI hints:
   - Tooltip on Vim mode selection mentioning fixed keyboard?
   - Help text explaining what fixed keyboard does?
   - Link to documentation?

### Timeline and Scope

7. **Deadline**: Do you have a target timeline for this migration?

8. **MVP Definition**: What's the minimum viable product:
   - Just h/j/k/l working?
   - All 50+ commands working?
   - RTL support included?

9. **Incremental Shipping**: Would you prefer to:
   - Ship each phase incrementally (config → basic keys → full feature → RTL)?
   - Ship everything at once?

---

## 11. Next Steps

### Immediate Actions (Today)

1. **Review this document thoroughly**
2. **Answer clarification questions** (Section 10)
3. **Verify you have access** to Zettlr 3.6.0 repo
4. **Test building** Zettlr 3.6.0 to verify environment

### Phase 1 Start (Tomorrow)

1. **Build Zettlr 3.6.0**:
   ```bash
   cd /Users/orwa/repos/Zettlr-official
   yarn install --frozen-lockfile
   yarn start
   ```

2. **Test existing Vim mode** (checklist in Phase 1)

3. **Experiment with @replit/codemirror-vim API**:
   - Try Vim.map() in console
   - Test getCM() function
   - Test Vim.handleKey()

4. **Read referenced files** to understand architecture

5. **Report findings** and any blockers

### Ongoing

- **Document issues** as you encounter them
- **Update this guide** with findings
- **Ask questions** early (don't wait until blocked)
- **Commit frequently** to feature branch

---

## 12. Resources and References

### CodeMirror 6 Documentation
- **Main Docs**: https://codemirror.net/docs/
- **API Reference**: https://codemirror.net/docs/ref/
- **Migration Guide**: https://codemirror.net/docs/migration/

### @replit/codemirror-vim
- **GitHub**: https://github.com/replit/codemirror-vim
- **npm**: https://www.npmjs.com/package/@replit/codemirror-vim
- **README**: https://github.com/replit/codemirror-vim/blob/master/README.md

### Zettlr Resources
- **Main Repo**: https://github.com/Zettlr/Zettlr
- **Discussions**: https://github.com/Zettlr/Zettlr/discussions
- **Issues**: https://github.com/Zettlr/Zettlr/issues

### Related Issues
- **vimrc support request**: https://github.com/Zettlr/Zettlr/issues/4643
- **Vim mode discussion**: https://github.com/Zettlr/Zettlr/discussions/3751
- **RTL support (old)**: https://github.com/Zettlr/Zettlr/issues/656

### Your Previous Work
- **Research findings**: `/Users/orwa/repos/zettlr/ZETTLR_3_RESEARCH_FINDINGS.md`
- **Feature explanation**: `/Users/orwa/repos/zettlr/VIM_FIXED_KEYBOARD_EXPLANATION.md`
- **2.3.0 implementation**:
  - `/Users/orwa/repos/zettlr/source/common/modules/markdown-editor/hooks/vim-fixed-keyboard.ts`
  - `/Users/orwa/repos/zettlr/source/common/modules/markdown-editor/keyboard-layout-mapper.ts`

### Community Resources
- **Obsidian vimrc plugin**: https://github.com/esm7/obsidian-vimrc-support (similar feature)
- **CodeMirror Discuss**: https://discuss.codemirror.net/ (ask questions here)

---

## Appendix A: KeyboardEvent.code Reference

Relevant physical key codes for Vim commands:

```typescript
// Letter keys
'KeyA' through 'KeyZ'

// Number keys (unshifted)
'Digit0' through 'Digit9'

// Shifted number keys (for $, ^, *, #, @, %)
'Digit4' + shift → '$'
'Digit6' + shift → '^'
'Digit8' + shift → '*'
'Digit3' + shift → '#'
'Digit2' + shift → '@'
'Digit5' + shift → '%'

// Punctuation
'Slash'       → '/'
'Comma'       → ','
'Period'      → '.'
'Semicolon'   → ';'
'Quote'       → '\''
'BracketLeft' → '['
'BracketRight'→ ']'

// Special keys
'Escape', 'Enter', 'Tab', 'Backspace', 'Delete'
'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'
```

---

## Appendix B: Vim Command Reference

Commands currently mapped in 2.3.0 implementation:

**Navigation**:
- `h`, `j`, `k`, `l` - Basic movement
- `w`, `W`, `b`, `B`, `e`, `E` - Word movement
- `0`, `$`, `^` - Line navigation
- `H`, `M`, `L` - Screen positioning
- `g`, `G` - Document navigation

**Editing**:
- `i`, `I`, `a`, `A`, `o`, `O` - Insert modes
- `x`, `X`, `s`, `S` - Delete/substitute
- `d`, `D`, `c`, `C`, `y`, `Y`, `p`, `P` - Operators
- `u`, `U`, `r`, `R` - Undo/replace

**Visual**:
- `v`, `V` - Visual modes

**Search**:
- `/`, `*`, `#` - Search
- `n`, `N` - Next/previous result
- `f`, `F`, `t`, `T` - Character find
- `;`, `,` - Repeat find

**Other**:
- `m`, `M` - Marks
- `q`, `@` - Macros
- `.` - Repeat
- `z` - Screen commands

**Total**: 50+ commands mapped

---

## Appendix C: File Structure Comparison

### Zettlr 2.3.0 (CM5)
```
source/common/modules/markdown-editor/
├── index.ts                        # MarkdownEditor class
├── load-plugins.ts                 # Loads CM5 vim keymap
├── hooks/
│   ├── vim-fixed-keyboard.ts       # Your feature (CM5 style)
│   ├── footnotes.ts
│   └── [other hooks]
├── plugins/
│   ├── search.ts
│   └── [CM5 plugins]
├── modes/
│   ├── markdown-zkn.ts
│   └── [CM5 modes]
└── keyboard-layout-mapper.ts       # Your mapper module
```

### Zettlr 3.6.0 (CM6)
```
source/common/modules/markdown-editor/
├── index.ts                        # MarkdownEditor class
├── editor-extension-sets.ts        # Extension composition
├── plugins/
│   ├── vim-mode.ts                 # Vim integration
│   ├── vim-fixed-keyboard.ts       # Your feature (CM6 style) [TO CREATE]
│   ├── typewriter.ts
│   ├── remote-doc.ts
│   └── [CM6 extensions]
├── keymaps/
│   └── default.ts                  # CM6 keymaps
├── autocomplete/
├── linters/
├── renderers/
├── util/
│   └── configuration.ts
└── keyboard-layout-mapper.ts       # Your mapper module [TO PORT]
```

---

**END OF MIGRATION GUIDE**

This document should be updated as you progress through the migration. Document any deviations from the plan, new findings, or issues encountered.

Good luck with the migration! The architecture is sound, and the feature is valuable. Take it incrementally, test thoroughly, and don't hesitate to engage with the CM6/Zettlr communities if you hit roadblocks.
