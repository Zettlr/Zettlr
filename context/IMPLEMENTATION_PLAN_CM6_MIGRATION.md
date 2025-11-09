# Implementation Plan: Vim Fixed Keyboard + RTL Migration to Zettlr 3.6.0

**Document Type**: Executive Planning & Decision Document
**Date Created**: 2025-11-08
**Author**: Orwa Diraneyya
**Status**: Planning Phase
**Target Version**: Zettlr 3.6.0 (CodeMirror 6)

---

## Executive Summary

This document outlines the complete plan for migrating the **Vim Fixed Keyboard Layout** feature and **RTL text direction support** from Zettlr 2.3.0 (CodeMirror 5) to Zettlr 3.6.0 (CodeMirror 6).

**Current Status**:
- ✅ Feature **fully implemented and working** in Zettlr 2.3.0 (branch: `v2.3.0-arabic`)
- ✅ Supports 50+ Vim commands with Arabic keyboard
- ✅ 100% Arabic translation coverage (772 strings)
- ❌ RTL cursor positioning broken in CM5 (unfixable)

**Migration Goal**:
- Port feature to modern Zettlr 3.6.0 (CM6 architecture)
- Re-introduce RTL text direction support (removed in 3.x)
- Verify RTL + Vim cursor positioning works in CM6
- Maintain all functionality and improve where possible

**Total Estimated Effort**: 2-4 weeks

---

## Table of Contents

1. [Strategic Overview](#1-strategic-overview)
2. [Architecture Analysis](#2-architecture-analysis)
3. [Risk Assessment & Mitigation](#3-risk-assessment--mitigation)
4. [Implementation Approach](#4-implementation-approach)
5. [Phased Implementation Plan](#5-phased-implementation-plan)
6. [Testing Strategy](#6-testing-strategy)
7. [Decision Points & Go/No-Go Criteria](#7-decision-points--gono-go-criteria)
8. [Resource Requirements](#8-resource-requirements)
9. [Success Metrics](#9-success-metrics)
10. [Appendices](#10-appendices)

---

## 1. Strategic Overview

### 1.1 Why Migrate?

**Current Situation** (Zettlr 2.3.0 + CM5):
- ✅ Vim fixed keyboard works perfectly
- ✅ Feature is production-ready
- ❌ RTL cursor positioning fundamentally broken (CM5 limitation)
- ❌ CodeMirror 5 is legacy/unmaintained
- ❌ Missing modern Zettlr features (collaboration, improvements)

**Future with 3.6.0** (CM6):
- ✅ Modern, maintained codebase
- ✅ Better RTL architecture (used on Hebrew Wikipedia)
- ✅ Latest Zettlr features
- ⚠️ RTL + Vim cursor positioning status **UNKNOWN** (must test)
- ⚠️ Requires complete feature re-implementation

**Strategic Decision**: Migrate if RTL + Vim works in CM6. Otherwise, document limitations and maintain 2.3.0 fork.

### 1.2 Feature Value Proposition

**Market Evidence**:
1. **Obsidian** (major competitor) has same feature - marked **EXPERIMENTAL**, doesn't work reliably
2. **Arabic Obsidian users** created workarounds because Obsidian's implementation failed
3. **Zettlr users** requesting vimrc-style configuration (issue #4643)
4. **Our implementation** is more robust than Obsidian's

**User Impact**:
- Makes Vim mode usable for RTL/non-Latin language writers
- Critical for bilingual academic writers (Arabic, Hebrew, Persian, etc.)
- Removes friction from workflow (no manual keyboard switching)

**Competitive Advantage**:
- Better implementation than existing solutions
- Potential for upstream contribution
- Fills gap in markdown editor ecosystem

### 1.3 Architectural Transition

**From**: Zettlr 2.3.0 + CodeMirror 5
```
Hooks-based architecture
├── vim-fixed-keyboard.ts (hook)
├── keyboard-layout-mapper.ts (static mappings)
├── Direct CM5 vim object access
└── Event-based mode tracking
```

**To**: Zettlr 3.6.0 + CodeMirror 6
```
Extension-based composition
├── vim-fixed-keyboard.ts (CM6 extension)
├── keyboard-layout-mapper.ts (ported, minimal changes)
├── @replit/codemirror-vim integration
└── State-based mode tracking via getCM()
```

**Key Change**: Hooks → Extensions, but core logic remains similar

---

## 2. Architecture Analysis

### 2.1 CodeMirror 6 Key Differences

| Aspect | CM5 (Current) | CM6 (Target) | Impact |
|--------|---------------|--------------|--------|
| **Architecture** | Monolithic | Extension composition | ⚠️ Medium - Need to create CM6 extension |
| **Vim Mode** | `codemirror/keymap/vim` | `@replit/codemirror-vim` | ⚠️ Medium - API differences |
| **Event Handling** | `cm.on('keydown')` | `EditorView.domEventHandlers` | ✅ Low - Similar pattern |
| **Mode Tracking** | `vim-mode-change` event | Via `getCM(view).state.vim` | ⚠️ Medium - Different access pattern |
| **Config System** | Direct properties | StateField + Compartments | ⚠️ Medium - Need compartment for toggling |
| **RTL Support** | Manual, buggy | Better architecture, removed in 3.x | ⚠️ HIGH - Must re-implement |

### 2.2 Zettlr 3.6.0 Structure

**Editor Module**: `/source/common/modules/markdown-editor/`

```
├── index.ts                        # MarkdownEditor class
├── editor-extension-sets.ts        # Extension loading (KEY FILE)
│   ├── getCoreExtensions()         # Core extensions for all editors
│   ├── getMarkdownExtensions()     # Markdown-specific
│   └── inputModeCompartment        # Vim/Emacs dynamic switching
├── plugins/
│   ├── vim-mode.ts                 # Vim integration wrapper (INTEGRATION POINT)
│   └── [NEW] vim-fixed-keyboard.ts # Our feature goes here
├── keyboard-layout-mapper.ts       # [NEW] Port from 2.3.0
└── util/configuration.ts           # Config system
```

**Config System**: `/source/app/service-providers/config/`
```
├── get-config-template.ts          # Add vimFixedKeyboardLayout here
└── [types update needed]
```

**Preferences UI**: `/source/win-preferences/schema/editor.ts`
```
getEditorFields() function          # Add checkbox UI here
```

### 2.3 @replit/codemirror-vim Integration

**Current Usage in 3.6.0** (`plugins/vim-mode.ts`):
```typescript
import { Vim, vim, getCM } from '@replit/codemirror-vim'

export function vimPlugin(): Extension {
  // Custom Ex commands
  Vim.defineEx('write', 'w', writeHandler)
  Vim.defineEx('quit', 'q', quitHandler)

  // Key remappings (visual line movement)
  Vim.map('j', 'gj')
  Vim.map('k', 'gk')

  // Remove conflicts
  Vim.unmap('<C-f>')

  return [vim()]  // Returns extension
}
```

**Our Extension Will Use**:
- `getCM(view)` - Get CM5 compatibility object from EditorView
- `Vim.handleKey(cm5, 'h', 'user')` - Trigger Vim command programmatically
- `view.contentDOM` - Access DOM element for event interception

### 2.4 RTL Support Investigation

**Findings**:
- ✅ RTL config settings (`editor.direction`, `editor.rtlMoveVisually`) existed in 2.3.0
- ❌ **REMOVED** during CM5→CM6 migration in Zettlr 3.x
- ⚠️ Preferences UI has **placeholder**: "We are currently planning on re-introducing bidirectional writing support"
- ✅ CM6 has **better RTL architecture** than CM5 (deployed on Hebrew Wikipedia)
- ⚠️ **UNKNOWN**: Whether RTL + Vim mode cursor positioning works

**Git History**:
```
987f5260e - fix(editor): Correctly switch RTL behaviour
d32dd4bc0 - Re-add direction setting to MarkdownEditor
73e556174 - Fiddling with RTL support
397e01bf0 - Added RTL support, closes #656
```

**Critical Question**: Does CM6 solve the RTL + Vim cursor positioning issue that was unfixable in CM5?

**Answer Method**: Build and test Zettlr 3.6.0 with Arabic text + Vim mode BEFORE migrating feature.

---

## 3. Risk Assessment & Mitigation

### 3.1 Critical Risks (BLOCKER)

#### Risk 1: RTL + Vim Cursor Positioning Still Broken
**Probability**: MEDIUM
**Impact**: CRITICAL
**Description**: CM6 might not fix the cursor positioning issue where `$`, `A`, `0`, `^` commands place cursor at wrong position in RTL text.

**Mitigation**:
- **Phase 0** (IMMEDIATE): Test official Zettlr 3.6.0 with Arabic + Vim BEFORE starting migration
- Build 3.6.0, enable Vim, test RTL cursor commands
- Document exact behavior with screenshots
- **Decision Point**: If broken, decide whether to:
  - Ship feature without RTL support (document limitation)
  - Stay on 2.3.0 fork indefinitely
  - Investigate CM6 RTL + Vim fix (engage maintainers)

**Go/No-Go Criteria**:
- ✅ GO: RTL cursor positioning works correctly in 3.6.0
- ⚠️ CONDITIONAL GO: Broken but fixable (estimate effort)
- ❌ NO-GO: Broken and unfixable, RTL is critical requirement

#### Risk 2: @replit/codemirror-vim API Incompatibility
**Probability**: LOW
**Impact**: HIGH
**Description**: The `getCM()` compatibility layer or `Vim.handleKey()` might not work as expected.

**Mitigation**:
- **Phase 1**: Test `getCM()` and `Vim.handleKey()` early
- Read @replit/codemirror-vim source code for implementation details
- Create minimal test extension before full implementation
- **Fallback**: Pure `Vim.map()` approach (limited but functional)

**Testing Checkpoint**: After Phase 1, verify `Vim.handleKey()` triggers commands correctly

### 3.2 High Risks

#### Risk 3: Dynamic Config Changes Don't Work
**Probability**: LOW
**Impact**: MEDIUM
**Description**: Toggling `vimFixedKeyboardLayout` in preferences might not update extension without restart.

**Mitigation**:
- Follow Zettlr's existing pattern for `inputModeCompartment`
- Create similar compartment for vim-fixed-keyboard extension
- Test config changes thoroughly
- **Worst Case**: Require app restart (document in UI)

**Acceptance Criteria**: Toggling setting in preferences takes effect immediately or within 2 seconds

#### Risk 4: Mode Detection Unreliable
**Probability**: LOW
**Impact**: MEDIUM
**Description**: Detecting Vim Normal/Visual/Insert modes via `getCM().state.vim` might be unreliable or change between versions.

**Mitigation**:
- Research @replit/codemirror-vim mode tracking implementation
- Add defensive checks and fallbacks
- Log mode transitions during testing
- **Fallback**: Optimistic approach (assume Normal mode, handle errors gracefully)

**Testing**: Verify mode detection across all mode transitions (i, a, o, v, ESC, Ctrl+[)

### 3.3 Medium Risks

#### Risk 5: Performance Degradation
**Probability**: LOW
**Impact**: LOW
**Description**: DOM event interception on every keypress might introduce input lag.

**Mitigation**:
- Profile keydown handler execution time (target: <1ms)
- Optimize physical key lookup (use Map instead of object)
- Early return for Insert mode (no processing)
- Test on slower machines

**Performance Target**: <1ms keydown handler execution, no perceptible lag

#### Risk 6: Translation Format Changes
**Probability**: CERTAIN
**Impact**: LOW
**Description**: Translation format changed from JSON (2.3.0) to PO format (3.6.0).

**Mitigation**:
- Convert ar-AR.json to ar-AR.po format
- Use Zettlr's translation tools/scripts
- Verify all 772 strings are preserved
- **Effort**: 1-2 days

**Acceptance**: All UI strings appear correctly in Arabic

### 3.4 Low Risks

#### Risk 7: Platform-Specific Issues
**Probability**: MEDIUM
**Impact**: LOW
**Description**: Keyboard event handling might differ on Windows/Mac/Linux.

**Mitigation**:
- Test on all three platforms (use VMs if needed)
- Check `event.code` values on each platform
- Add platform-specific workarounds if needed

**Testing Matrix**: Test on macOS, Windows, Linux with Arabic keyboard

---

## 4. Implementation Approach

### 4.1 Selected Strategy: HYBRID

**Decision**: Use DOM event interception (proven approach) + optional Vim.map() fallback

**Rationale**:
- ✅ DOM interception works perfectly in 2.3.0
- ✅ Handles all edge cases (shift keys, 50+ commands)
- ✅ Independent of keyboard layout
- ✅ Can be toggled via config
- ⚠️ Vim.map() has limitations but provides fallback

**Architecture**:
```typescript
// Primary: DOM Event Interception Extension
function vimFixedKeyboardExtension(): Extension {
  return EditorView.domEventHandlers({
    keydown(event: KeyboardEvent, view: EditorView): boolean {
      // Only in Vim mode
      if (!isVimMode(view)) return false

      // Only in Normal/Visual mode
      const mode = getVimMode(view)
      if (mode !== 'normal' && mode !== 'visual') return false

      // Map physical key to Vim command
      const vimCommand = getVimCommandForPhysicalKey(
        event.code,
        event.shiftKey
      )

      if (vimCommand) {
        event.preventDefault()
        event.stopImmediatePropagation()

        const cm5 = getCM(view)
        Vim.handleKey(cm5, vimCommand, 'user')
        return true
      }

      return false
    }
  })
}

// Secondary: Optional Vim.map() for Basic Keys
function addBasicVimMappings() {
  // In vimPlugin(), only if config enabled
  if (config.vimFixedKeyboardLayout) {
    Vim.map('ت', 'j', 'normal')  // Arabic navigation
    Vim.map('ن', 'k', 'normal')
    Vim.map('م', 'l', 'normal')
    Vim.map('ا', 'h', 'normal')
    // Basic only, not all 50+ commands
  }
}
```

### 4.2 Component Breakdown

**Component 1: Keyboard Layout Mapper** (Port from 2.3.0)
- File: `keyboard-layout-mapper.ts`
- Function: Physical key code → Vim command mapping
- Change: Minimal (same logic, new file location)
- Effort: 1 day

**Component 2: Vim Fixed Keyboard Extension** (Rewrite for CM6)
- File: `plugins/vim-fixed-keyboard.ts`
- Function: DOM event interception, mode detection, command triggering
- Change: Significant (CM5 hook → CM6 extension)
- Effort: 3-5 days

**Component 3: Config Integration** (New)
- Files: `get-config-template.ts`, `config-provider.d.ts`
- Function: Add `editor.vimFixedKeyboardLayout` setting
- Change: Straightforward (follow existing pattern)
- Effort: 1 day

**Component 4: Preferences UI** (New)
- File: `schema/editor.ts`
- Function: Checkbox to enable/disable feature
- Change: Straightforward (add checkbox field)
- Effort: 1 day

**Component 5: Extension Loading** (Modify existing)
- File: `editor-extension-sets.ts`
- Function: Conditionally load vim-fixed-keyboard extension
- Change: Add to `inputModeCompartment` or create new compartment
- Effort: 2 days

**Component 6: RTL Support** (Re-implement)
- Files: `get-config-template.ts`, `schema/editor.ts`, `index.ts`
- Function: Add `editor.direction` setting, apply to editor
- Change: Re-add removed functionality
- Effort: 3-5 days (includes testing)

**Component 7: Arabic Translations** (Update)
- File: `ar-AR.po`
- Function: Update translations for 3.6.0 UI
- Change: Convert JSON → PO, update strings
- Effort: 1-2 days

---

## 5. Phased Implementation Plan

### Phase 0: RTL + Vim Verification (IMMEDIATE - 1 day)

**Goal**: Determine if CM6 fixes RTL cursor positioning issue

**Tasks**:
1. Build official Zettlr 3.6.0 from `/Users/orwa/repos/Zettlr-official/`
2. Install dependencies: `yarn install --frozen-lockfile`
3. Start development: `yarn start`
4. Enable Vim mode in preferences
5. Create test document with Arabic text
6. Test cursor positioning commands:
   - `$` - Move to end of line
   - `A` - Append at end of line
   - `0` - Move to beginning of line
   - `^` - Move to first non-blank character
   - `h` - Move left (should move right in RTL)
   - `l` - Move right (should move left in RTL)
   - `w` - Next word
   - `b` - Previous word

**Success Criteria**:
- ✅ **PASS**: Cursor appears at correct position for all commands
- ⚠️ **PARTIAL**: Some commands work, some don't (document which)
- ❌ **FAIL**: Cursor positioning broken like CM5

**Decision Point**: If FAIL, consult on whether to proceed without RTL or abandon migration

**Deliverables**:
- Test report document with screenshots
- Screen recording of cursor behavior
- Decision: GO / CONDITIONAL GO / NO-GO for migration

**Timeline**: Complete within 1 day (8 hours)

---

### Phase 1: Environment Setup & Architecture Exploration (2-3 days)

**Goal**: Set up development environment and understand CM6 architecture

**Tasks**:
1. **Fork Strategy Decision**:
   - Option A: Create new branch from official 3.6.0
   - Option B: Create separate fork repository
   - **Recommended**: New branch `v3.6.0-arabic-vim-rtl` from official develop

2. **Build System Verification**:
   - Install dependencies
   - Verify build works: `yarn start`
   - Verify packaging works: `yarn package`
   - Identify any build issues

3. **Architecture Study**:
   - Read `editor-extension-sets.ts` thoroughly
   - Read `plugins/vim-mode.ts` implementation
   - Read `util/configuration.ts` for config system
   - Understand `inputModeCompartment` pattern

4. **API Experimentation**:
   - Create minimal test extension
   - Test `getCM(view)` API
   - Test `Vim.handleKey()` API
   - Test mode detection: `getCM(view).state.vim.mode`
   - Verify DOM event interception works

5. **Documentation**:
   - Document CM6 extension creation process
   - Document config integration process
   - Document findings and gotchas

**Success Criteria**:
- ✅ Can build and run Zettlr 3.6.0
- ✅ Understand extension composition system
- ✅ Verified `getCM()` and `Vim.handleKey()` work
- ✅ Created minimal test extension successfully

**Deliverables**:
- Development environment ready
- Test extension demonstrating API usage
- Architecture notes document

**Timeline**: 2-3 days (16-24 hours)

---

### Phase 2: Core Feature Implementation (1-2 weeks)

#### Phase 2A: Config & Preferences UI (2-3 days)

**Tasks**:
1. Add config properties to `get-config-template.ts`:
   ```typescript
   editor: {
     vimFixedKeyboardLayout: false,  // Enable fixed keyboard for Vim Normal mode
     // ... existing properties
   }
   ```

2. Add TypeScript types (if needed)

3. Update preferences schema (`schema/editor.ts`):
   ```typescript
   {
     type: 'checkbox',
     label: trans('dialog.preferences.vim_fixed_keyboard_layout'),
     model: 'editor.vimFixedKeyboardLayout'
   }
   ```

4. Add translation key to en-US.po

**Testing**:
- [ ] Config default value is `false`
- [ ] Checkbox appears in preferences UI
- [ ] Checkbox state persists across restarts
- [ ] Config value accessible via `window.config.get('editor.vimFixedKeyboardLayout')`

**Deliverable**: Config and UI foundation ready

#### Phase 2B: Port Keyboard Layout Mapper (1 day)

**Tasks**:
1. Copy `/Users/orwa/repos/zettlr/source/common/modules/markdown-editor/keyboard-layout-mapper.ts` to `/Users/orwa/repos/Zettlr-official/source/common/modules/markdown-editor/keyboard-layout-mapper.ts`

2. Verify no changes needed (pure mapping logic, no CM dependencies)

3. Add TypeScript exports if needed

**Testing**:
- [ ] Import works: `import { getVimCommandForPhysicalKey } from './keyboard-layout-mapper'`
- [ ] Returns correct commands:
  - `getVimCommandForPhysicalKey('KeyH', false)` → `'h'`
  - `getVimCommandForPhysicalKey('KeyA', true)` → `'A'`
  - `getVimCommandForPhysicalKey('Digit4', true)` → `'$'`
- [ ] All 50+ mappings verified

**Deliverable**: Mapper logic ready for use

#### Phase 2C: Create CM6 Extension (5-7 days)

**Tasks**:
1. Create `/Users/orwa/repos/Zettlr-official/source/common/modules/markdown-editor/plugins/vim-fixed-keyboard.ts`

2. Implement extension structure:
   ```typescript
   import { EditorView, type Extension } from '@codemirror/view'
   import { getCM, Vim } from '@replit/codemirror-vim'
   import { getVimCommandForPhysicalKey } from '../keyboard-layout-mapper'

   export function vimFixedKeyboardPlugin(): Extension {
     let processingKey = false

     return EditorView.domEventHandlers({
       keydown(event: KeyboardEvent, view: EditorView): boolean {
         // Guard against re-entry
         if (processingKey) return false

         // Check if Vim mode enabled (via config)
         const config = view.state.field(configField)
         if (config.inputMode !== 'vim') return false

         // Get Vim mode
         const cm5 = getCM(view)
         const vimState = (cm5 as any).state.vim
         if (!vimState) return false

         const mode = vimState.mode || 'normal'
         if (mode !== 'normal' && mode !== 'visual') return false

         // Skip modifier keys
         if (event.ctrlKey || event.altKey || event.metaKey) return false

         // Get Vim command for physical key
         const vimCommand = getVimCommandForPhysicalKey(
           event.code,
           event.shiftKey
         )

         if (vimCommand !== null) {
           event.preventDefault()
           event.stopPropagation()
           event.stopImmediatePropagation()

           processingKey = true
           try {
             Vim.handleKey(cm5, vimCommand, 'user')
           } finally {
             processingKey = false
           }

           return true
         }

         return false
       }
     })
   }
   ```

3. Handle edge cases:
   - Re-entry guard
   - Mode detection errors
   - Config access
   - Event cleanup

4. Add cleanup if needed (for dynamic toggling)

**Testing**:
- [ ] Extension loads without errors
- [ ] Mode detection works (Normal, Insert, Visual)
- [ ] h, j, k, l work with Arabic keyboard in Normal mode
- [ ] All 50+ commands work
- [ ] Shift key commands work (I, A, O, $, ^, etc.)
- [ ] Insert mode is unaffected (Arabic typing works)
- [ ] No input lag (< 1ms per keystroke)
- [ ] No console errors

**Deliverable**: Working vim-fixed-keyboard extension

#### Phase 2D: Integration with Extension System (2-3 days)

**Tasks**:
1. Import extension in `editor-extension-sets.ts`:
   ```typescript
   import { vimFixedKeyboardPlugin } from './plugins/vim-fixed-keyboard'
   ```

2. Add to extension loading logic:
   ```typescript
   function getCoreExtensions(options: CoreExtensionOptions): Extension[] {
     const inputMode: Extension[] = []

     if (options.initialConfig.inputMode === 'vim') {
       inputMode.push(vimPlugin())

       // Add fixed keyboard if enabled
       if (options.initialConfig.vimFixedKeyboardLayout) {
         inputMode.push(vimFixedKeyboardPlugin())
       }
     }

     return [inputModeCompartment.of(inputMode), ...]
   }
   ```

3. Handle dynamic config changes in `index.ts`:
   ```typescript
   private onConfigUpdate(newOptions: Partial<EditorConfiguration>): void {
     // Existing inputMode change handler

     // Add vimFixedKeyboardLayout change handler
     if (newOptions.vimFixedKeyboardLayout !== undefined &&
         newOptions.vimFixedKeyboardLayout !== this.config.vimFixedKeyboardLayout) {
       this.reconfigureVimFixedKeyboard(newOptions.vimFixedKeyboardLayout)
     }
   }

   private reconfigureVimFixedKeyboard(enabled: boolean): void {
     const currentMode = this.config.inputMode
     if (currentMode === 'vim') {
       const extensions = enabled
         ? [vimPlugin(), vimFixedKeyboardPlugin()]
         : [vimPlugin()]

       this._instance.dispatch({
         effects: inputModeCompartment.reconfigure(extensions)
       })
     }
   }
   ```

4. Alternative: Create separate compartment for vim-fixed-keyboard (if dynamic toggling doesn't work with inputModeCompartment)

**Testing**:
- [ ] Feature works when enabled in config
- [ ] Feature doesn't activate when disabled
- [ ] Toggling in preferences updates immediately (or within 2 seconds)
- [ ] Switching to Emacs/Default mode disables feature
- [ ] Switching back to Vim re-enables if config is true

**Deliverable**: Fully integrated feature with config control

**Phase 2 Success Criteria**:
- ✅ All 50+ Vim commands work with Arabic keyboard
- ✅ Feature can be toggled in preferences
- ✅ No regressions in existing Vim mode functionality
- ✅ Performance acceptable (no lag)
- ✅ Code passes linting and type checking

**Phase 2 Timeline**: 1-2 weeks (8-10 days)

---

### Phase 3: RTL Text Direction Support (3-5 days)

**Goal**: Re-add RTL direction support removed in 3.x migration

**Prerequisite**: Phase 0 shows RTL + Vim cursor positioning works in CM6

#### Phase 3A: Add RTL Config Settings (1 day)

**Tasks**:
1. Add config properties:
   ```typescript
   editor: {
     direction: 'ltr' as 'ltr'|'rtl',  // Text direction
     // Optional: rtlMoveVisually if needed
   }
   ```

2. Add to preferences schema:
   ```typescript
   {
     title: trans('Writing direction'),
     group: PreferencesGroups.Editor,
     fields: [
       {
         type: 'radio',
         model: 'editor.direction',
         options: {
           ltr: trans('Left-to-right'),
           rtl: trans('Right-to-left')
         }
       }
     ]
   }
   ```

**Testing**:
- [ ] Config default is 'ltr'
- [ ] Radio buttons appear in preferences
- [ ] Selection persists

**Deliverable**: RTL config ready

#### Phase 3B: Implement Direction Switching (2 days)

**Tasks**:
1. Research CM6 RTL implementation:
   - Check if `EditorView.editorAttributes` with `dir: 'rtl'` works
   - Or if need to use `EditorView.direction` state effect
   - Study Hebrew Wikipedia's CM6 implementation

2. Apply direction to editor:
   ```typescript
   // Option A: CSS-based
   EditorView.editorAttributes.of({ dir: config.direction })

   // Option B: StateEffect-based
   import { EditorView } from '@codemirror/view'
   // Use EditorView.perLineTextDirection or similar
   ```

3. Add direction change handler:
   ```typescript
   private onConfigUpdate(newOptions: Partial<EditorConfiguration>): void {
     if (newOptions.direction !== undefined &&
         newOptions.direction !== this.config.direction) {
       this.updateDirection(newOptions.direction)
     }
   }
   ```

4. Test with Arabic text

**Testing**:
- [ ] Arabic text flows right-to-left when direction='rtl'
- [ ] English text flows left-to-right when direction='ltr'
- [ ] Switching direction updates editor immediately
- [ ] Cursor behaves correctly in both directions

**Deliverable**: Working RTL direction switching

#### Phase 3C: Critical RTL + Vim Testing (2 days)

**Tasks**:
1. Create comprehensive RTL + Vim test document:
   ```markdown
   # RTL Vim Test

   هذا اختبار للنصوص العربية مع وضع Vim.

   This is a test of mixed LTR and RTL text.

   نص طويل جداً لاختبار حركة المؤشر في نهاية السطر والبداية والكلمات والأحرف.
   ```

2. Test all cursor movement commands:
   - `h` - Left (should move visually right in RTL)
   - `l` - Right (should move visually left in RTL)
   - `j` / `k` - Down / Up
   - `w` - Next word
   - `b` - Previous word
   - `e` - End of word
   - `0` - Start of line
   - `$` - End of line (CRITICAL - was broken in CM5)
   - `^` - First non-blank
   - `A` - Append at end (CRITICAL - was broken in CM5)
   - `I` - Insert at beginning
   - `C` - Change to end of line (CRITICAL - was broken in CM5)
   - `D` - Delete to end of line (CRITICAL - was broken in CM5)

3. Test with mixed LTR/RTL text

4. Document any issues with screenshots

**Success Criteria**:
- ✅ **PASS**: All commands place cursor correctly
- ⚠️ **PARTIAL**: Some commands work, document which ones fail
- ❌ **FAIL**: Cursor positioning broken (critical blocker)

**Decision Point**:
- If PASS: Proceed with full migration
- If PARTIAL: Decide if acceptable, document limitations
- If FAIL: Abort RTL support, ship feature without RTL

**Deliverable**: RTL + Vim test report with decision

**Phase 3 Success Criteria**:
- ✅ RTL text direction works
- ✅ Vim cursor positioning correct in RTL (or documented limitations)
- ✅ Config-based direction switching works
- ✅ No regressions in LTR mode

**Phase 3 Timeline**: 3-5 days

---

### Phase 4: Arabic Translations (1-2 days)

**Goal**: Update Arabic translations for Zettlr 3.6.0 UI

#### Phase 4A: Translation Format Conversion (Half day)

**Tasks**:
1. Understand PO format used in 3.6.0:
   ```po
   msgid "dialog.preferences.vim_fixed_keyboard_layout"
   msgstr "استخدام تخطيط لوحة مفاتيح ثابت لوضع Vim Normal"
   ```

2. Check if Zettlr has conversion scripts:
   - Look in `/scripts/` directory
   - Check `package.json` for translation-related commands

3. Convert ar-AR.json (2.3.0) to ar-AR.po (3.6.0):
   - Use conversion tool if available
   - Or manual conversion (tedious but straightforward)

4. Verify all 772 strings are preserved

**Deliverable**: ar-AR.po file with base translations

#### Phase 4B: Update Translations for New UI (1 day)

**Tasks**:
1. Compare English strings between 2.3.0 and 3.6.0:
   - Find new strings introduced in 3.x
   - Find changed strings
   - Find removed strings

2. Add new translations:
   - `vim_fixed_keyboard_layout` (already have from 2.3.0)
   - `writing_direction` / RTL-related strings
   - Any new 3.6.0 UI strings

3. Update changed translations

4. Remove obsolete translations

5. Update metadata:
   - Update timestamp
   - Verify author list

**Testing**:
- [ ] Change app language to Arabic in preferences
- [ ] Verify all UI strings appear in Arabic
- [ ] Verify new vim/RTL strings appear correctly
- [ ] Check for untranslated strings (should be none)

**Deliverable**: 100% Arabic translation coverage for 3.6.0

**Phase 4 Success Criteria**:
- ✅ All UI strings translated
- ✅ New feature strings included
- ✅ App fully functional in Arabic

**Phase 4 Timeline**: 1-2 days

---

### Phase 5: Testing & Refinement (3-5 days)

#### Phase 5A: Comprehensive Testing (2-3 days)

**Test Matrix**:

| Dimension | Values | Test Count |
|-----------|--------|------------|
| **Platform** | macOS, Windows, Linux | 3 |
| **Keyboard Layout** | Arabic, Hebrew, English | 3 |
| **Vim Commands** | 50+ commands | 50+ |
| **Text Direction** | LTR, RTL | 2 |
| **Modes** | Normal, Insert, Visual | 3 |

**Total Test Scenarios**: ~100+

**Testing Checklist**:

**Platform Testing**:
- [ ] macOS: All features work
- [ ] Windows: All features work
- [ ] Linux: All features work

**Keyboard Layout Testing**:
- [ ] Arabic keyboard: All 50+ commands work in Normal mode
- [ ] Arabic keyboard: Arabic typing works in Insert mode
- [ ] Hebrew keyboard: Commands work (if Hebrew mappings added)
- [ ] English keyboard: No regressions

**Vim Command Testing** (with Arabic keyboard):
- [ ] Navigation: h, j, k, l, w, b, e, ge, 0, $, ^, gg, G
- [ ] Insert: i, I, a, A, o, O, s, S, C
- [ ] Delete: x, X, d, dd, D, dw, db, d$, d0
- [ ] Change: c, cc, cw, C
- [ ] Copy/Paste: y, yy, Y, p, P
- [ ] Visual: v, V, Ctrl+v
- [ ] Search: /, ?, n, N, *, #
- [ ] Marks: m, ', `
- [ ] Numbers: 5j, 10k, 2w, 3dw
- [ ] Registers: "ayy, "ap
- [ ] Undo/Redo: u, Ctrl+r
- [ ] Misc: r, ~, J, gj, gk, zz, zt, zb

**RTL Testing** (if implemented):
- [ ] Cursor at correct position for: $, A, 0, ^, h, l, w, b
- [ ] Mixed LTR/RTL text handled correctly
- [ ] Direction toggle works

**Config Testing**:
- [ ] Feature enabled: Commands work with Arabic keyboard
- [ ] Feature disabled: Normal Vim behavior (broken with Arabic)
- [ ] Toggle in preferences: Takes effect immediately
- [ ] Survives app restart

**Performance Testing**:
- [ ] No perceptible input lag
- [ ] Keydown handler < 1ms execution time
- [ ] Large documents: No slowdown

**Regression Testing**:
- [ ] Normal Vim mode with English keyboard: No changes
- [ ] Emacs mode: Not affected
- [ ] Default mode: Not affected
- [ ] Other editor features: Not affected

#### Phase 5B: Bug Fixes & Polish (1-2 days)

**Tasks**:
1. Fix any bugs found in Phase 5A testing
2. Optimize performance if needed
3. Improve error handling
4. Add debug logging (optional, can be removed later)
5. Code cleanup and documentation

**Deliverable**: Production-ready feature

**Phase 5 Success Criteria**:
- ✅ All tests pass
- ✅ Zero critical bugs
- ✅ Performance acceptable
- ✅ Code quality high

**Phase 5 Timeline**: 3-5 days

---

### Phase 6: Documentation & Release (1-2 days)

#### Phase 6A: Documentation (1 day)

**Tasks**:
1. Update `VIM_FIXED_KEYBOARD_EXPLANATION.md` for CM6
2. Create user guide (README or wiki)
3. Document RTL support status
4. Create changelog entry
5. Document known limitations

**Deliverables**:
- User-facing documentation
- Developer documentation
- Changelog

#### Phase 6B: Prepare for Release (1 day)

**Tasks**:
1. Create pull request (if contributing upstream):
   - Write comprehensive PR description
   - Reference issue #4643 (vimrc request)
   - Include screenshots/GIFs
   - List testing completed

2. Or create release in fork:
   - Tag version (e.g., v3.6.0-arabic-vim-1.0)
   - Build installers: `yarn release:mac-x64`, etc.
   - Upload to GitHub releases
   - Write release notes

3. Update CLAUDE.md with current status

**Deliverable**: Release ready

**Phase 6 Timeline**: 1-2 days

---

## 6. Testing Strategy

### 6.1 Testing Levels

**Level 1: Unit Testing**
- Keyboard layout mapper: Physical key → Vim command
- Mode detection: getCM().state.vim.mode
- Config access: window.config.get()

**Level 2: Integration Testing**
- Extension loading
- Config changes propagation
- Mode switching (Normal ↔ Insert ↔ Visual)
- DOM event interception

**Level 3: System Testing**
- Full workflow: Enable feature, use Vim with Arabic keyboard
- All 50+ commands in realistic editing scenarios
- RTL text editing with Vim

**Level 4: Acceptance Testing**
- Real-world usage by Arabic/Hebrew users
- Performance under normal writing conditions
- Cross-platform compatibility

### 6.2 Test Environments

**Development**:
- macOS 14.x (primary development environment)
- Arabic keyboard layout installed
- Zettlr built from source

**Staging**:
- Packaged app (`yarn package`)
- Fresh config (no cached settings)
- Hebrew keyboard (if available)

**Production**:
- Released installer
- Multiple machines
- Real user workflows

### 6.3 Automated Testing (Optional)

**Unit Tests** (if time permits):
```typescript
// test/keyboard-layout-mapper.spec.ts
import { expect } from 'chai'
import { getVimCommandForPhysicalKey } from '../source/common/modules/markdown-editor/keyboard-layout-mapper'

describe('Keyboard Layout Mapper', () => {
  it('maps KeyH to h command', () => {
    expect(getVimCommandForPhysicalKey('KeyH', false)).to.equal('h')
  })

  it('maps Shift+KeyI to I command', () => {
    expect(getVimCommandForPhysicalKey('KeyI', true)).to.equal('I')
  })

  it('maps Digit4+Shift to $ command', () => {
    expect(getVimCommandForPhysicalKey('Digit4', true)).to.equal('$')
  })

  // ... 50+ more tests
})
```

**Run tests**: `yarn test`

### 6.4 Manual Testing Checklist

See Phase 5A for comprehensive checklist.

---

## 7. Decision Points & Go/No-Go Criteria

### Decision Point 1: After Phase 0 (RTL Testing)

**Question**: Does CM6 fix RTL + Vim cursor positioning?

**Criteria**:
- ✅ **GO**: All cursor commands ($, A, 0, ^) work correctly in RTL
- ⚠️ **CONDITIONAL**: Some work, some don't - Assess criticality
- ❌ **NO-GO**: Completely broken, RTL is critical requirement

**Actions**:
- GO: Proceed with full migration
- CONDITIONAL: Decide if partial RTL acceptable, document limitations
- NO-GO: Stay on 2.3.0 fork, re-evaluate strategy

### Decision Point 2: After Phase 1 (API Verification)

**Question**: Do CM6 APIs work as expected?

**Criteria**:
- ✅ **GO**: getCM(), Vim.handleKey(), mode detection all work
- ⚠️ **CONDITIONAL**: Some APIs problematic - Find workarounds
- ❌ **NO-GO**: Critical APIs broken or incompatible

**Actions**:
- GO: Proceed with Phase 2
- CONDITIONAL: Adjust implementation approach
- NO-GO: Halt migration, report findings

### Decision Point 3: After Phase 2 (Core Feature)

**Question**: Is core feature functional?

**Criteria**:
- ✅ **GO**: All 50+ commands work with Arabic keyboard
- ⚠️ **CONDITIONAL**: Most work, some edge cases fail
- ❌ **NO-GO**: Feature fundamentally broken

**Actions**:
- GO: Proceed with Phase 3 (RTL)
- CONDITIONAL: Fix critical issues before proceeding
- NO-GO: Halt, re-evaluate approach

### Decision Point 4: After Phase 3 (RTL Support)

**Question**: Is RTL + Vim usable?

**Criteria**:
- ✅ **GO**: RTL cursor positioning works
- ⚠️ **CONDITIONAL**: Mostly works with known limitations
- ❌ **NO-GO**: RTL cursor positioning broken

**Actions**:
- GO: Proceed with Phase 4 (Translations)
- CONDITIONAL: Document limitations, decide if acceptable
- NO-GO: Ship without RTL support, update documentation

### Decision Point 5: After Phase 5 (Testing)

**Question**: Is feature production-ready?

**Criteria**:
- ✅ **GO**: All tests pass, no critical bugs, acceptable performance
- ⚠️ **CONDITIONAL**: Minor issues remain
- ❌ **NO-GO**: Critical bugs or performance issues

**Actions**:
- GO: Proceed to release
- CONDITIONAL: Fix issues in Phase 5B
- NO-GO: Extended debugging/refactoring needed

---

## 8. Resource Requirements

### 8.1 Time Resources

**Total Estimated Time**: 2-4 weeks (15-30 days)

**Breakdown**:
- Phase 0: 1 day
- Phase 1: 2-3 days
- Phase 2: 8-10 days
- Phase 3: 3-5 days
- Phase 4: 1-2 days
- Phase 5: 3-5 days
- Phase 6: 1-2 days
- Buffer: 2-3 days

**Critical Path**: Phase 0 → Phase 1 → Phase 2 → Phase 5

**Parallel Work Possible**:
- Phase 4 (Translations) can start earlier if translation work is independent

### 8.2 Technical Resources

**Development Environment**:
- macOS machine with development tools
- Xcode Command Line Tools (for native modules)
- Node.js 16+ and Yarn
- 20GB+ free disk space (for builds)

**Testing Environments**:
- macOS (primary)
- Windows 10+ (VM or physical)
- Linux (Ubuntu/Fedora VM)

**Keyboard Layouts**:
- Arabic keyboard layout installed on all test platforms
- Hebrew keyboard (optional but recommended)

**Tools**:
- Git
- Code editor (VS Code recommended)
- Screen recording software (for bug reports)
- Performance profiling tools (Chrome DevTools)

### 8.3 Knowledge Resources

**Required Knowledge**:
- TypeScript/JavaScript
- CodeMirror 6 architecture (can learn during Phase 1)
- Electron app structure
- Vim command knowledge
- Arabic language (for testing and translations)

**Learning Resources**:
- CodeMirror 6 documentation: https://codemirror.net/docs/
- @replit/codemirror-vim source: https://github.com/replit/codemirror-vim
- Zettlr architecture: Existing codebase + this plan
- Migration guide: `MIGRATION_GUIDE_3.6.0.md`

---

## 9. Success Metrics

### 9.1 Feature Completeness

**Core Functionality**:
- ✅ 50+ Vim commands work with non-English keyboards
- ✅ Shift key commands work (I, A, O, $, ^, *, etc.)
- ✅ Config-based enable/disable
- ✅ Preferences UI checkbox
- ✅ Works on macOS, Windows, Linux

**RTL Support** (if Phase 0 passes):
- ✅ RTL text direction switching
- ✅ Vim cursor positioning correct in RTL (or documented limitations)
- ✅ Config-based direction control

**Translations**:
- ✅ 100% Arabic translation coverage
- ✅ All UI strings appear correctly

### 9.2 Quality Metrics

**Performance**:
- ✅ Keydown handler execution < 1ms
- ✅ No perceptible input lag
- ✅ Large documents (10,000+ lines) not affected

**Reliability**:
- ✅ Zero crashes
- ✅ Zero data loss scenarios
- ✅ Graceful degradation on errors

**Compatibility**:
- ✅ Works with Arabic keyboard
- ✅ (Optional) Works with Hebrew keyboard
- ✅ No regressions for English keyboard users
- ✅ Compatible with all three platforms

### 9.3 User Experience Metrics

**Usability**:
- ✅ Feature discoverable (checkbox in preferences)
- ✅ Works as expected (no surprises)
- ✅ Insert mode unaffected (Arabic typing works normally)
- ✅ Documentation clear and helpful

**Adoption** (post-release):
- Track: Number of users enabling feature (if telemetry available)
- Track: Bug reports related to feature
- Track: User feedback (positive/negative)

---

## 10. Appendices

### Appendix A: File Inventory

**Files to Create** (6 new files):
1. `/source/common/modules/markdown-editor/keyboard-layout-mapper.ts` - Port from 2.3.0
2. `/source/common/modules/markdown-editor/plugins/vim-fixed-keyboard.ts` - New CM6 extension
3. `/test/keyboard-layout-mapper.spec.ts` - Unit tests (optional)
4. `/static/lang/ar-AR.po` - Updated Arabic translations (convert from JSON)
5. Documentation files (user guide, changelog)
6. Test reports and screenshots

**Files to Modify** (8-10 existing files):
1. `/source/app/service-providers/config/get-config-template.ts` - Add config
2. `/source/types/main/config-provider.d.ts` - Add TypeScript types (if needed)
3. `/source/win-preferences/schema/editor.ts` - Add UI
4. `/source/common/modules/markdown-editor/editor-extension-sets.ts` - Load extension
5. `/source/common/modules/markdown-editor/index.ts` - Handle config changes
6. `/source/common/modules/markdown-editor/plugins/vim-mode.ts` - Optional Vim.map() integration
7. `/static/lang/en-US.po` - Add English translation keys
8. `CLAUDE.md` - Update project status
9. `README.md` or docs (if updating)
10. `package.json` (if version bumping)

### Appendix B: Vim Commands Supported (50+)

**Navigation**:
- h, j, k, l (left, down, up, right)
- w, W, b, B, e, E, ge, gE (word movement)
- 0, ^, $ (line boundaries)
- gg, G, :{number} (document navigation)
- Ctrl+f, Ctrl+b, Ctrl+d, Ctrl+u (page/half-page)
- H, M, L (screen position)
- %, (, ), {, } (bracket/paragraph)
- f, F, t, T, ; , (character search)

**Insert**:
- i, I, a, A, o, O (insert modes)
- s, S, C (substitute/change)

**Delete**:
- x, X (delete character)
- d, dd, D (delete)
- dw, db, d$, d0, d^ (delete motions)

**Change**:
- c, cc, C (change)
- cw, cb, c$, c0 (change motions)
- r, R (replace)
- ~ (toggle case)

**Copy/Paste**:
- y, yy, Y (yank)
- p, P (paste)
- "[register] (register access)

**Visual**:
- v, V, Ctrl+v (visual modes)

**Search**:
- /, ?, n, N, *, # (search)

**Marks**:
- m[a-z], '[a-z], `[a-z] (marks)

**Misc**:
- u, Ctrl+r (undo/redo)
- . (repeat)
- J (join lines)
- gj, gk (visual line movement)
- zz, zt, zb (scroll)
- >> , << (indent)

**Numbers**: All above work with counts (5j, 3dw, etc.)

### Appendix C: Keyboard Layout Mappings

**Arabic QWERTY Mappings** (50+ keys):
```
Physical Key → Arabic Character → Vim Command

KeyQ → ض → q
KeyW → ص → w
KeyE → ث → e
KeyR → ق → r
KeyT → ف → t
KeyY → غ → y
KeyU → ع → u
KeyI → ه → i
KeyO → خ → o
KeyP → ح → p

KeyA → ش → a
KeyS → س → s
KeyD → ي → d
KeyF → ب → f
KeyG → ل → g
KeyH → ا → h
KeyJ → ت → j
KeyK → ن → k
KeyL → م → l

KeyZ → ئ → z
KeyX → ء → x
KeyC → ؤ → c
KeyV → ر → v
KeyB → لا → b
KeyN → ى → n
KeyM → ة → m

Digit0-9 → Numbers and symbols
... (full mapping in keyboard-layout-mapper.ts)
```

**Shift Key Mappings**:
```
Shift+KeyI → ÷ → I (Vim insert at beginning)
Shift+KeyA → ﻷ → A (Vim append at end)
Shift+KeyO → × → O (Vim open line above)
Shift+Digit4 → $ → $ (Vim end of line)
Shift+Digit6 → ¤ → ^ (Vim first non-blank)
... etc.
```

### Appendix D: Risk Register Summary

| Risk ID | Risk | Probability | Impact | Mitigation | Phase |
|---------|------|-------------|--------|------------|-------|
| R1 | RTL + Vim cursor broken | MEDIUM | CRITICAL | Test in Phase 0 | 0 |
| R2 | @replit/codemirror-vim API issues | LOW | HIGH | API testing in Phase 1 | 1 |
| R3 | Dynamic config changes broken | LOW | MEDIUM | Follow existing patterns | 2 |
| R4 | Mode detection unreliable | LOW | MEDIUM | Defensive checks, fallbacks | 2 |
| R5 | Performance degradation | LOW | LOW | Profile, optimize | 5 |
| R6 | Translation format changes | CERTAIN | LOW | Use conversion tools | 4 |
| R7 | Platform-specific issues | MEDIUM | LOW | Multi-platform testing | 5 |

### Appendix E: Reference Documents

**Created for This Project**:
1. `MIGRATION_GUIDE_3.6.0.md` - Comprehensive technical guide (12,000+ words)
2. `ZETTLR_3_RESEARCH_FINDINGS.md` - Research on Zettlr 3.x/4.x vs 2.3.0
3. `ARABIC_TRANSLATIONS_SUMMARY.md` - 2.3.0 translation work summary
4. `VIM_FIXED_KEYBOARD_EXPLANATION.md` - Feature explanation (2.3.0)
5. This document: `IMPLEMENTATION_PLAN_CM6_MIGRATION.md`

**External References**:
- Zettlr official repo: https://github.com/Zettlr/Zettlr
- CodeMirror 6 docs: https://codemirror.net/docs/
- @replit/codemirror-vim: https://github.com/replit/codemirror-vim
- Zettlr issue #4643: vimrc configuration request
- Obsidian vimrc-support: https://github.com/esm7/obsidian-vimrc-support

### Appendix F: Glossary

**CM5**: CodeMirror 5 - Legacy editor framework used in Zettlr 2.3.0
**CM6**: CodeMirror 6 - Modern editor framework used in Zettlr 3.6.0
**RTL**: Right-to-left text direction (Arabic, Hebrew, Persian, etc.)
**LTR**: Left-to-right text direction (English, etc.)
**Extension**: CM6's modular plugin system
**Compartment**: CM6's dynamic reconfiguration mechanism
**StateField**: CM6's state management primitive
**DOM capture phase**: Event handling phase that runs before target phase
**Physical key code**: Hardware key position (e.g., KeyH) independent of layout
**Character key**: The character produced by a key (e.g., 'ا' on KeyH in Arabic)
**Vim Normal mode**: Vim's command mode (navigation, editing)
**Vim Insert mode**: Vim's typing mode (regular text input)
**Vim Visual mode**: Vim's selection mode

---

## Document Status

**Version**: 1.0
**Last Updated**: 2025-11-08
**Next Review**: After Phase 0 completion
**Status**: DRAFT - Pending Phase 0 execution

**Approval**:
- [ ] Phase 0 RTL test results reviewed
- [ ] GO/NO-GO decision made
- [ ] Implementation phases approved
- [ ] Resource allocation confirmed

**Maintenance**:
This document will be updated at the end of each phase with:
- Actual results vs. planned
- Lessons learned
- Adjustments to subsequent phases
- Updated risk assessments

---

**End of Implementation Plan**
