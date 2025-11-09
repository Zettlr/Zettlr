# Vim Fixed Keyboard Layout - Debugging Analysis

## Problem Statement

User reports: "Even after restarting Zettlr, the vim fixed keyboard feature continues to work regardless of whether the checkbox is checked or unchecked. The j/k/h/l keys always work with Arabic keyboard in Vim Normal mode."

## Root Cause Analysis

### Finding #1: Plugin is Always Loaded (CONFIRMED)

**File**: `source/common/modules/markdown-editor/plugins/vim-mode.ts` (Lines 118-123)

```typescript
export function vimPlugin (): Extension {
  return [
    vim(),
    vimFixedKeyboard() // ← ALWAYS loaded unconditionally!
  ]
}
```

**Impact**: The vim fixed keyboard plugin is loaded whenever vim mode is active, regardless of the `vimFixedKeyboardLayout` config setting.

### Finding #2: Guard Clause Exists But May Not Be Effective

**File**: `source/common/modules/markdown-editor/hooks/vim-fixed-keyboard.ts` (Lines 83-86)

```typescript
const config = this.view.state.field(configField)
if (!config.vimFixedKeyboardLayout) {
  return
}
```

**Analysis**:
- The guard clause reads from the configField state
- If `vimFixedKeyboardLayout` is false, it should return early
- However, the event listener is still active and fires on every keydown

**Hypothesis**: The guard clause IS working, but there may be a timing issue where:
1. Config updates happen asynchronously
2. The state field doesn't update immediately
3. The throttled config retrieval (1 second delay) delays propagation

### Finding #3: Config Propagation Path

**Config Update Flow**:
1. User toggles checkbox in preferences
2. Pinia store updates via `setConfigValue()`
3. IPC message sent to main process
4. Main process updates config file
5. Main process broadcasts 'config-provider' update event
6. **THROTTLED** retrieval in Pinia store (1000ms delay)
7. Vue watch fires on `editorConfiguration` computed property
8. `currentEditor?.setOptions(newValue)` called
9. Editor dispatches `configUpdateEffect.of(this.config)`
10. `configField` state field updates

**Critical Issue**: Steps 5-6 introduce a 1000ms delay via throttling:

**File**: `source/pinia/config.ts` (Lines 37-39)
```typescript
const throttledRetrieve = _.throttle(() => {
  config.value = retrieveConfig()
}, 1000)
```

### Finding #4: Type Definitions Are Correct

The `EditorConfiguration` interface correctly includes:
- `vimFixedKeyboardLayout: boolean` (line 80)
- `vimKeyMappings: Record<string, KeyMapping>` (line 81)

The `EditorConfigOptions` type is correctly defined as `Partial<EditorConfiguration>` (line 182).

## Why The Feature "Always Works"

### Two Possible Scenarios:

#### Scenario A: Guard Clause Not Reading Updated Config
- Config updates are throttled (1 second delay)
- User tests immediately after toggling checkbox
- `configField` hasn't updated yet
- Guard clause reads old config value
- Feature still works during testing window

#### Scenario B: Config Value Not Persisting
- User toggles checkbox
- Config updates in memory
- User restarts Zettlr BEFORE config is saved to disk
- Zettlr loads old config on restart
- Feature remains in previous state

#### Scenario C: Config Default Value Issue
- Default value for `vimFixedKeyboardLayout` might be `true`
- If config file doesn't have the key, defaults to `true`
- User's config file might not have the key yet

## Verification Needed

### Question 1: What is the actual config value?
We need to verify what `config.vimFixedKeyboardLayout` returns in the guard clause.

### Question 2: Is the config persisting?
Check if the value is actually saved to the config file and loaded on restart.

### Question 3: Is there a timing issue?
The 1-second throttle could cause the feature to work for 1 second after toggling off.

## Recommended Fixes

### Fix #1: Make Plugin Loading Conditional (ARCHITECTURAL FIX)

**File**: `source/common/modules/markdown-editor/plugins/vim-mode.ts`

```typescript
export function vimPlugin (enableFixedKeyboard: boolean = false): Extension {
  const extensions: Extension[] = [vim()]

  if (enableFixedKeyboard) {
    extensions.push(vimFixedKeyboard())
  }

  return extensions
}
```

**Then update**: `source/common/modules/markdown-editor/editor-extension-sets.ts` (Line 152-153)

```typescript
if (options.initialConfig.inputMode === 'vim') {
  inputMode.push(vimPlugin(options.initialConfig.vimFixedKeyboardLayout))
}
```

**And update**: `source/common/modules/markdown-editor/index.ts` `onConfigUpdate()` (Line 554-555)

```typescript
} else if (newOptions.inputMode === 'vim') {
  this._instance.dispatch({
    effects: inputModeCompartment.reconfigure(
      vimPlugin(newOptions.vimFixedKeyboardLayout ?? this.config.vimFixedKeyboardLayout)
    )
  })
}
```

**Impact**:
- Plugin only loads when feature is enabled
- No event listener overhead when feature is disabled
- Proper architectural separation

**Risk**:
- Requires reconfiguring the editor when feature is toggled
- May cause brief editor disruption

### Fix #2: Add Visual Debugging (TEMPORARY)

Add visible feedback to see what's happening:

**File**: `source/common/modules/markdown-editor/hooks/vim-fixed-keyboard.ts`

```typescript
private handleKeydown (event: KeyboardEvent): void {
  // Prevent re-entry
  if (this.processingKey) {
    return
  }

  const config = this.view.state.field(configField)

  // TEMPORARY DEBUGGING: Show config value in console
  if (event.key === 'j' || event.key === 'k') {
    console.log('[Vim Fixed Keyboard] vimFixedKeyboardLayout =', config.vimFixedKeyboardLayout)
  }

  if (!config.vimFixedKeyboardLayout) {
    return
  }

  // ... rest of handler
}
```

**Then ask user to**:
1. Open DevTools (View → Developer → Toggle Developer Tools)
2. Toggle the checkbox in preferences
3. Press j/k keys in vim normal mode
4. Check console output

### Fix #3: Remove Config Throttling for Critical Settings (TARGETED FIX)

**File**: `source/pinia/config.ts`

The 1-second throttle is too aggressive for a desktop application. Consider:

**Option A**: Remove throttling entirely
```typescript
// Remove throttle - config updates are not that heavy
ipcRenderer.on('config-provider', (event, { command }) => {
  if (command === 'update') {
    config.value = retrieveConfig()
  }
})
```

**Option B**: Reduce throttle to 100ms
```typescript
const throttledRetrieve = _.throttle(() => {
  config.value = retrieveConfig()
}, 100) // Much more responsive
```

**Option C**: Don't throttle specific config paths
```typescript
ipcRenderer.on('config-provider', (event, { command, payload }) => {
  if (command === 'update') {
    // Critical editor settings update immediately
    const criticalPaths = ['editor.vimFixedKeyboardLayout', 'editor.inputMode']
    if (payload?.path && criticalPaths.some(p => payload.path.startsWith(p))) {
      config.value = retrieveConfig()
    } else {
      throttledRetrieve()
    }
  }
})
```

### Fix #4: Check Config Default Value

**File**: `source/app/service-providers/config/get-config-template.ts`

Verify the default value for `vimFixedKeyboardLayout`:

```typescript
editor: {
  // ... other settings
  vimFixedKeyboardLayout: false, // ← Should be false by default
  vimKeyMappings: getDefaultVimKeyMappings()
}
```

If this is missing or set to `true`, that would explain why the feature always works.

## Recommended Debugging Steps

### Step 1: Add Console Logging
Modify the guard clause to log config values to console.

### Step 2: Check Config File
Have user check their config file:
- macOS: `~/Library/Application Support/Zettlr/config.json`
- Windows: `%APPDATA%/Zettlr/config.json`
- Linux: `~/.config/Zettlr/config.json`

Search for `vimFixedKeyboardLayout` - is it present? What's the value?

### Step 3: Test Timing
1. Toggle checkbox OFF
2. Wait 2 seconds (to ensure throttle completes)
3. Test vim commands
4. Report if feature is disabled

### Step 4: Test After Restart
1. Toggle checkbox OFF
2. Wait 2 seconds
3. Restart Zettlr
4. Check config file again
5. Test vim commands

## My Recommendation

**Implement Fix #1 (Conditional Plugin Loading)** because:

1. It's architecturally correct - plugins should only load when needed
2. It eliminates the entire class of timing/config-reading issues
3. It reduces overhead when feature is disabled
4. It's how CodeMirror 6 extensions are designed to work

**Additionally implement Fix #3 Option B** (reduce throttle to 100ms) because:
1. A 1-second delay is unacceptable UX for a desktop app
2. Config updates are not computationally expensive
3. 100ms is imperceptible to users but still provides some protection

## Questions for User

1. **Can you open DevTools?** (View → Developer → Toggle Developer Tools)
   - If yes: We can add console logging
   - If no: We need file-based debugging

2. **What is in your config file?**
   - Check `~/Library/Application Support/Zettlr/config.json`
   - Search for `vimFixedKeyboardLayout`
   - What's the value?

3. **Testing timing**:
   - Toggle checkbox OFF
   - Wait 2 full seconds
   - Test vim commands (j/k/h/l)
   - Does the feature still work?

4. **After restart**:
   - Toggle checkbox OFF
   - Wait 2 seconds
   - Restart Zettlr
   - Check config file again
   - Does the feature still work?
