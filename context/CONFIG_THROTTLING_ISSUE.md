# Config Throttling Issue and Fix

## Problem Statement

The Pinia config store (`source/pinia/config.ts`) implements a **1-second throttle** on all config updates received from the main process. This was causing the Vim Fixed Keyboard Layout feature to have a 1-second delay when toggling the checkbox in preferences.

## Root Cause

### Why Throttling Exists

The throttling was added to handle **high-frequency UI state updates**, specifically:

1. **Split panel sizes** (`ui.fileManagerSplitSize`, `ui.editorSidebarSplitSize`)
   - When users drag split panel dividers, `setConfigValue()` fires **dozens of times per second**
   - Without throttling, this would cause excessive IPC calls and re-renders

2. **Other UI state** (sidebar visibility, current tab selection, etc.)

The original comment states:
> "We want the config to update some values extremely frequently, and with the throttle in place, we ensure that the (sometimes heavy) config updaters don't cause lag."

### The Architectural Problem

**This is poor architecture** because:

1. ❌ **UI state and user preferences are mixed** - Window positions/sizes shouldn't be in the same config as editor settings
2. ❌ **Throttling the read side doesn't help** - The main process still processes every write immediately
3. ❌ **All config changes are delayed** - Critical user preference changes (like vim mode toggles) wait up to 1 second
4. ❌ **Wrong throttling strategy** - Split panel sizes should use **debounce** (wait until user stops dragging), not **throttle** (limit frequency during dragging)

### Impact on Vim Fixed Keyboard Feature

When user toggles "Use fixed keyboard layout for Vim Normal mode":

1. ✅ Preferences window calls `setConfigValue('editor.vimFixedKeyboardLayout', false)`
2. ✅ Main process updates config immediately
3. ✅ Main process broadcasts `config-provider update` to all windows
4. ❌ **Main editor window waits up to 1 second** before fetching the new config
5. ❌ User continues using vim and the mappings still work (feature appears broken)

## Short-Term Fix (Implemented)

**File**: `/Users/orwa/repos/Zettlr-official/source/pinia/config.ts`

**Change**: When `setConfigValue()` is called, immediately update the local config without waiting for the broadcast:

```typescript
function setConfigValue (property: string, value: any): boolean {
  const result = ipcRenderer.sendSync('config-provider', {
    command: 'set-config-single',
    payload: { key: property, val: value }
  })

  // IMMEDIATE UPDATE FIX: Bypass throttle for explicit user actions
  config.value = retrieveConfig()

  return result
}
```

### Why This Works

- **Explicit user actions** (clicking checkboxes, changing dropdowns) update **immediately**
- **Broadcast updates** (from other windows, split panel drags) still use throttling
- Zero impact on existing behavior, just bypasses the throttle for direct calls

### Limitations

This is a **workaround**, not a proper fix:
- Still fetches the entire config object on every `setConfigValue()` call
- Doesn't address the architectural problem
- The throttle still exists for broadcast updates (though this is less critical)

## Long-Term Fix (Recommended)

### Proper Architecture

1. **Separate UI state from user preferences**
   - Create `useUIStateStore` for window positions, split sizes, sidebar visibility
   - Keep `useConfigStore` only for user preferences
   - UI state can be throttled/debounced separately

2. **Use debounce instead of throttle for UI state**
   - Split panel sizes should save only **after** user stops dragging (debounce)
   - Not during dragging (throttle)

3. **Remove throttling from config store entirely**
   - User preference changes should be instant
   - No need to throttle if UI state is separated

### Implementation Plan

1. Create new Pinia store: `source/pinia/ui-state.ts`
   ```typescript
   export const useUIStateStore = defineStore('ui-state', () => {
     const splitSizes = ref({ fileManager: [20, 80], editorSidebar: [80, 20] })
     const sidebarVisible = ref(true)
     const currentTab = ref('files')

     // Debounce persistence (save after user stops interacting)
     const debouncedSave = _.debounce(() => {
       // Persist to main process
     }, 300)

     function setSplitSize(which, sizes) {
       splitSizes.value[which] = sizes
       debouncedSave()
     }

     return { splitSizes, sidebarVisible, currentTab, setSplitSize }
   })
   ```

2. Migrate UI state properties from config to UI state store
   - Move `ui.fileManagerSplitSize` → `uiState.splitSizes.fileManager`
   - Move `window.sidebarVisible` → `uiState.sidebarVisible`
   - Move `window.currentSidebarTab` → `uiState.currentTab`

3. Remove throttling from config store
   ```typescript
   // Remove throttledRetrieve entirely
   ipcRenderer.on('config-provider', (event, { command }) => {
     if (command === 'update') {
       config.value = retrieveConfig()  // No throttle!
     }
   })
   ```

4. Update all components to use the appropriate store
   - Preferences window → `useConfigStore`
   - Split panels → `useUIStateStore`
   - Sidebar toggles → `useUIStateStore`

### Benefits

- ✅ **Instant config updates** for all user preferences
- ✅ **Optimized UI state handling** with proper debouncing
- ✅ **Better separation of concerns**
- ✅ **More maintainable code**
- ✅ **Better performance** (fewer full config fetches)

### Risks

- Requires changes across multiple components
- Need to migrate existing UI state from config to new store
- Need to ensure backward compatibility with saved configs

## Testing Checklist

After implementing the short-term fix:

- [x] Toggle vim fixed keyboard checkbox → Should work instantly
- [ ] Drag split panel dividers → Should still work smoothly (throttle still active for broadcasts)
- [ ] Change other preferences → Should update instantly
- [ ] Multiple windows open → All should receive updates

After implementing the long-term fix:

- [ ] All config changes work instantly
- [ ] Split panel dragging is smooth and only saves after releasing
- [ ] No performance regression
- [ ] UI state persists across restarts
- [ ] Multiple windows sync correctly

## Related Files

### Short-Term Fix
- `source/pinia/config.ts` - Modified `setConfigValue()` to bypass throttle

### Long-Term Fix (To Be Implemented)
- `source/pinia/ui-state.ts` - New store (to be created)
- `source/win-main/App.vue` - Update split panel handlers
- `source/win-main/sidebar/MainSidebar.vue` - Update tab switching
- `source/app/service-providers/config/get-config-template.ts` - Remove UI state properties (eventually)

## References

- Original throttle discussion: `source/pinia/config.ts` lines 34-39
- Split panel usage: `source/win-main/App.vue` lines 685-691
- IPC config provider: `source/app/service-providers/config/index.ts` lines 426-440

## Date

- **Issue Identified**: 2025-01-09
- **Short-Term Fix Applied**: 2025-01-09
- **Long-Term Fix**: Planned (no ETA)
