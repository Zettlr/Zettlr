# Vim Fixed Keyboard Layout - Complete Fix

## Problem Summary

The vim fixed keyboard layout feature continues to work even when the user unchecks the preference checkbox. The h/j/k/l keys always work with non-Latin keyboards regardless of the setting.

## Root Cause

**Primary Issue**: The `vimFixedKeyboard()` plugin is **unconditionally loaded** whenever vim mode is active.

**File**: `source/common/modules/markdown-editor/plugins/vim-mode.ts` (Lines 118-123)

```typescript
export function vimPlugin (): Extension {
  return [
    vim(),
    vimFixedKeyboard() // ← ALWAYS loaded, regardless of config!
  ]
}
```

**Secondary Issue**: Even though there's a guard clause that reads the config, the plugin remains loaded and the event listener remains active (just returns early).

## The Fix: Two Approaches

### Approach 1: Conditional Plugin Loading (RECOMMENDED)

This is the proper architectural fix. Only load the plugin when the feature is enabled.

#### Step 1: Modify vim-mode.ts

**File**: `source/common/modules/markdown-editor/plugins/vim-mode.ts`

Change the `vimPlugin()` function to accept a parameter:

```typescript
/**
 * Creates the Vim extension with optional fixed keyboard layout support
 * @param enableFixedKeyboard Whether to enable the fixed keyboard layout feature
 */
export function vimPlugin (enableFixedKeyboard: boolean = false): Extension {
  const extensions: Extension[] = [vim()]

  // Only load the fixed keyboard plugin if the feature is enabled
  if (enableFixedKeyboard) {
    extensions.push(vimFixedKeyboard())
  }

  return extensions
}
```

#### Step 2: Update Initial Plugin Loading

**File**: `source/common/modules/markdown-editor/editor-extension-sets.ts` (Line 152-153)

```typescript
if (options.initialConfig.inputMode === 'vim') {
  inputMode.push(vimPlugin(options.initialConfig.vimFixedKeyboardLayout))
}
```

#### Step 3: Update Dynamic Plugin Reconfiguration

**File**: `source/common/modules/markdown-editor/index.ts` (Line 545-572)

Add detection for `vimFixedKeyboardLayout` changes and reconfigure the vim plugin:

```typescript
private onConfigUpdate (newOptions: Partial<EditorConfiguration>): void {
  const inputModeChanged = newOptions.inputMode !== undefined && newOptions.inputMode !== this.config.inputMode
  const darkModeChanged = newOptions.darkMode !== undefined && newOptions.darkMode !== this.config.darkMode
  const themeChanged = newOptions.theme !== undefined && newOptions.theme !== this.config.theme
  const vimFixedKeyboardChanged = newOptions.vimFixedKeyboardLayout !== undefined &&
    newOptions.vimFixedKeyboardLayout !== this.config.vimFixedKeyboardLayout

  // Third: The input mode, if applicable
  if (inputModeChanged || (vimFixedKeyboardChanged && this.config.inputMode === 'vim')) {
    if (newOptions.inputMode === 'emacs' || this.config.inputMode === 'emacs') {
      this._instance.dispatch({ effects: inputModeCompartment.reconfigure(emacs()) })
    } else if (newOptions.inputMode === 'vim' || this.config.inputMode === 'vim') {
      // Use the new value if it's changing, otherwise use the current config value
      const enableFixed = newOptions.vimFixedKeyboardLayout ?? this.config.vimFixedKeyboardLayout
      this._instance.dispatch({ effects: inputModeCompartment.reconfigure(vimPlugin(enableFixed)) })
    } else {
      this._instance.dispatch({ effects: inputModeCompartment.reconfigure([]) })
    }
  }

  // Fourth: Switch theme, if applicable
  if (darkModeChanged || themeChanged) {
    const themes = getMainEditorThemes()

    this._instance.dispatch({
      effects: darkModeEffect.of({
        darkMode: newOptions.darkMode,
        ...themes[newOptions.theme ?? this.config.theme]
      })
    })
  }
}
```

**Impact**:
- ✅ Plugin only loads when feature is enabled
- ✅ Plugin reconfigures when feature is toggled
- ✅ No overhead when feature is disabled
- ✅ Proper separation of concerns
- ✅ Follows CodeMirror 6 architecture patterns

**Risks**:
- ⚠️ Reconfiguring vim mode may briefly reset vim state (cursor position, visual selection, etc.)
- ⚠️ Needs testing to ensure no disruption to user workflow

### Approach 2: Enhanced Guard Clause with Debugging (FALLBACK)

If Approach 1 causes issues, enhance the guard clause and add debugging:

**File**: `source/common/modules/markdown-editor/hooks/vim-fixed-keyboard.ts`

```typescript
private handleKeydown (event: KeyboardEvent): void {
  // Prevent re-entry
  if (this.processingKey) {
    return
  }

  // Check if the fixed keyboard layout feature is enabled
  const config = this.view.state.field(configField)

  // Debug logging (remove after debugging)
  if (event.code === 'KeyJ' || event.code === 'KeyK') {
    console.log('[Vim Fixed Keyboard] Feature enabled:', config.vimFixedKeyboardLayout)
    console.log('[Vim Fixed Keyboard] Full config:', {
      inputMode: config.inputMode,
      vimFixedKeyboardLayout: config.vimFixedKeyboardLayout,
      vimKeyMappingsCount: Object.keys(config.vimKeyMappings).length
    })
  }

  // If disabled, let CodeMirror handle keys normally
  if (!config.vimFixedKeyboardLayout) {
    return
  }

  // ... rest of handler
}
```

## Additional Fix: Remove Excessive Config Throttling

The 1-second throttle on config updates is too aggressive for a desktop application.

**File**: `source/pinia/config.ts` (Lines 37-39)

**Option A: Remove throttling entirely (RECOMMENDED)**

```typescript
// Listen to subsequent changes
ipcRenderer.on('config-provider', (event, { command }) => {
  if (command === 'update') {
    config.value = retrieveConfig()  // No throttle
  }
})
```

**Option B: Reduce to 100ms (COMPROMISE)**

```typescript
const throttledRetrieve = _.throttle(() => {
  config.value = retrieveConfig()
}, 100)  // Changed from 1000ms to 100ms
```

**Justification**:
- Config updates are not computationally expensive
- Desktop apps should feel responsive
- 1-second delay is perceptible and frustrating to users
- Even 100ms is likely unnecessary but provides minimal protection

## Implementation Plan

### Phase 1: Implement Conditional Loading (Approach 1)

1. Modify `source/common/modules/markdown-editor/plugins/vim-mode.ts`
2. Update `source/common/modules/markdown-editor/editor-extension-sets.ts`
3. Update `source/common/modules/markdown-editor/index.ts`

### Phase 2: Reduce Config Throttling

4. Modify `source/pinia/config.ts` (choose Option A or B)

### Phase 3: Testing

5. Build and test the application
6. Verify feature can be toggled on/off
7. Verify no disruption to vim workflow when toggling
8. Verify vim state is preserved during toggle

### Phase 4: Clean Up

9. Remove debug console.log statements if any were added
10. Update documentation if needed

## Testing Checklist

- [ ] Start Zettlr with vim mode enabled, feature disabled
- [ ] Verify h/j/k/l use character-based navigation (don't work with Arabic)
- [ ] Enable feature in preferences
- [ ] Verify h/j/k/l use physical key navigation (work with Arabic)
- [ ] Disable feature in preferences
- [ ] Verify h/j/k/l revert to character-based navigation
- [ ] Test trained key mappings ({, }, [, ], etc.)
- [ ] Restart Zettlr and verify setting persists
- [ ] Test with different keyboard layouts (Arabic, Hebrew, etc.)
- [ ] Verify no vim state loss during feature toggle

## Files to Modify

1. `/Users/orwa/repos/Zettlr-official/source/common/modules/markdown-editor/plugins/vim-mode.ts`
2. `/Users/orwa/repos/Zettlr-official/source/common/modules/markdown-editor/editor-extension-sets.ts`
3. `/Users/orwa/repos/Zettlr-official/source/common/modules/markdown-editor/index.ts`
4. `/Users/orwa/repos/Zettlr-official/source/pinia/config.ts`

## Expected Behavior After Fix

### When Feature is Disabled
- `vimFixedKeyboard()` plugin is NOT loaded
- No event listener overhead
- Vim uses default character-based navigation
- h/j/k/l keys only work with English/Latin keyboard

### When Feature is Enabled
- `vimFixedKeyboard()` plugin IS loaded
- Event listener intercepts keydown events
- Vim uses physical key-based navigation
- h/j/k/l keys work with any keyboard layout

### When Toggling Feature
- Vim plugin is reconfigured dynamically
- Setting takes effect immediately (no restart needed)
- Vim state is preserved (cursor position, mode, etc.)

## Alternative: Quick Verification First

Before implementing the full fix, verify the root cause by adding this debug code:

**File**: `source/common/modules/markdown-editor/hooks/vim-fixed-keyboard.ts` (Line 84)

```typescript
if (!config.vimFixedKeyboardLayout) {
  console.warn('[DEBUG] Vim fixed keyboard is DISABLED, returning early')
  console.warn('[DEBUG] Config value:', config.vimFixedKeyboardLayout)
  return
} else {
  console.log('[DEBUG] Vim fixed keyboard is ENABLED')
  console.log('[DEBUG] Config value:', config.vimFixedKeyboardLayout)
}
```

Then:
1. Build and run Zettlr
2. Open DevTools console
3. Toggle the feature on/off
4. Press h/j/k keys
5. Check console output

If you see "DISABLED" messages but the feature still works, then there's a different issue (possibly physical key mappings bypassing the plugin entirely).

If you see "ENABLED" messages when it should be disabled, then the config is not updating properly.
