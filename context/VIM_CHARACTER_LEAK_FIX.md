# Vim Character Leak Fix - ContentEditable Toggle

## Date
2025-11-09

## Problem Description

### The Bug
When using CodeMirror 6 with `@replit/codemirror-vim`, typing keys in quick succession while in **normal mode** causes characters to "leak" into the document. This results in:

1. Unwanted text appearing when typing in normal mode
2. Ability to insert spaces and newlines in normal mode
3. Unexpected automatic transition to insert mode

### Root Cause
The `@replit/codemirror-vim` plugin does NOT disable `contenteditable` when switching to normal mode. The DOM remains editable (`contenteditable="true"`) in all vim modes, allowing browser native input events to fire and insert characters before vim's keymap handlers can process them.

This is a **known bug** in `@replit/codemirror-vim`:
- Issue #178: "Random input in normal mode with IME" (OPEN)
- Issue #159: "Dead key input treated as insertion in normal mode" (OPEN)
- Issue #238: Multi-key mapping causes character deletion (OPEN)

### Why This Differs from Vanilla Vim
Vanilla Vim runs in a terminal with complete control over input. CodeMirror 6 uses browser `contenteditable`, creating race conditions between browser input events and vim's key handlers.

## Solution Implemented

### Approach
Dynamically toggle `contenteditable` based on vim mode using CodeMirror 6's Compartment API:
- **Normal/Visual mode**: Disable contenteditable (`EditorView.editable.of(false)`)
- **Insert/Replace mode**: Enable contenteditable (`EditorView.editable.of(true)`)

### Source
This workaround was posted on the CodeMirror forum (November 2024) by a user experiencing the same issue.

## Implementation Details

### File Modified
`source/common/modules/markdown-editor/hooks/vim-fixed-keyboard.ts`

### Key Changes

1. **Import Compartment**:
```typescript
import { Compartment } from '@codemirror/state'
```

2. **Create Editable Compartment**:
```typescript
const editableCompartment = new Compartment()
```

3. **Add updateEditableState Method**:
```typescript
private updateEditableState (mode: string): void {
  const shouldEdit = (mode === 'insert' || mode === 'replace')

  queueMicrotask(() => {
    this.view.dispatch({
      effects: editableCompartment.reconfigure(
        EditorView.editable.of(shouldEdit)
      )
    })
  })
}
```

4. **Call on Mode Change**:
```typescript
// In handleKeydown after detecting mode
if (this.currentMode !== mode) {
  this.currentMode = mode
  this.updateEditableState(mode)
}
```

5. **Initialize with Disabled State**:
```typescript
// In constructor
this.updateEditableState('normal')

// In export function
return [
  editableCompartment.of(EditorView.editable.of(false)),
  ViewPlugin.fromClass(VimCustomKeyMappingsPlugin)
]
```

### Critical Implementation Notes

- **queueMicrotask** is used to prevent race conditions between mode changes and DOM updates
- Initial state is **disabled** (normal mode default)
- Compartment must be included in the returned extensions array
- Mode detection happens in keydown handler (CM6 has no direct vim-mode-change event)

## Testing

### Before Fix
1. Start in normal mode
2. Type keys quickly (e.g., "hello")
3. **BUG**: Characters appear in document
4. Can insert spaces with spacebar
5. Can insert newlines with Enter

### After Fix
1. Start in normal mode
2. Type keys quickly
3. **FIXED**: Characters do NOT appear (contenteditable disabled)
4. Spacebar and Enter execute vim commands, don't insert text
5. Entering insert mode (i/a/o) re-enables contenteditable
6. Typing in insert mode works normally

### Test Scenarios
- [x] Typing in normal mode doesn't insert characters
- [x] Vim commands (h/j/k/l/w/b) still work in normal mode
- [x] Entering insert mode (i/a/o/I/A/O) enables typing
- [x] Exiting insert mode (Esc) disables contenteditable
- [x] Visual mode keeps contenteditable disabled
- [x] Replace mode enables contenteditable
- [x] Arabic/non-Latin keyboard input in insert mode works
- [x] Spaces and Enter in normal mode don't create unwanted whitespace

## Impact

### Benefits
- ✅ Prevents unwanted character insertion in normal mode
- ✅ Fixes the "automatic insert mode" behavior
- ✅ Improves vim mode usability for non-Latin keyboard users
- ✅ Prevents spaces and newlines from leaking into normal mode

### Limitations
- This is a **workaround**, not an upstream fix in @replit/codemirror-vim
- May need adjustment if vim plugin behavior changes
- Relies on mode detection via keydown events (no direct mode-change listener)

## Related Files
- `source/common/modules/markdown-editor/hooks/vim-fixed-keyboard.ts` - Implementation
- `source/common/modules/markdown-editor/index.ts` - Plugin registration

## Related Issues
- @replit/codemirror-vim Issue #178: Random input in normal mode with IME
- @replit/codemirror-vim Issue #159: Dead key input treated as insertion
- @replit/codemirror-vim Issue #238: Multi-key mapping character deletion

## References
- CodeMirror Forum: November 2024 post about IME handling in vim command mode
- CodeMirror 6 docs: EditorView.editable facet
- CodeMirror 6 docs: Compartment API for dynamic configuration

## Status
✅ **IMPLEMENTED AND TESTED** - Ready for use

## Future Considerations
If `@replit/codemirror-vim` officially implements proper contenteditable handling:
1. Monitor upstream issues #178, #159, #238
2. Test if this workaround can be removed
3. Update documentation accordingly
