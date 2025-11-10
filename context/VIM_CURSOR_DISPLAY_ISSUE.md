# Vim Cursor Display Issue

**Date**: 2025-11-10
**Status**: ⚠️ **KNOWN ISSUE** (separate from character leak)

## Problem

After the character leak fix, there is a remaining issue where the Vim block cursor disappears under certain conditions:

1. **Ctrl+A (Select All)** - Causes the block cursor to disappear
2. **Mouse selections** - Can break the cursor display

## What This Is NOT

This is **NOT** related to the character leak issue. Character leaking is completely fixed. This is a separate cursor rendering problem.

## Root Cause Hypothesis

The Vim plugin from `@replit/codemirror-vim` may not properly re-render the cursor after:
- Native browser selection operations (Ctrl+A)
- Mouse-based text selections
- Other operations that manipulate the selection outside of Vim commands

## Impact

- **Low**: The cursor becomes invisible but Vim commands still work
- **Workaround**: Pressing any movement key (j/k/h/l) typically restores the cursor
- **User Experience**: Minor annoyance, not a blocking issue

## Potential Solutions

### Option 1: Force Cursor Re-render After Selections

Monitor selection changes and force the Vim plugin to update its cursor display:

```typescript
// Pseudo-code
view.dom.addEventListener('selectionchange', () => {
  if (inVimNormalMode) {
    forceVimCursorUpdate()
  }
})
```

### Option 2: Patch Vim Plugin

The `@replit/codemirror-vim` plugin may need modifications to:
1. Listen for selection changes
2. Re-render the cursor block when selection changes in normal mode
3. Handle native browser selections (Ctrl+A, mouse clicks)

### Option 3: Prevent Native Selection Operations

Intercept Ctrl+A and mouse selections, convert them to Vim commands:
- Ctrl+A → `ggVG` (go to start, visual line mode, go to end)
- Mouse selection → Convert to visual mode selection

This maintains "pure Vim" behavior and avoids native selection issues.

## Investigation Needed

1. **Review vim plugin cursor code** - Check how cursor rendering works
2. **Test cursor update API** - See if there's a way to force cursor re-render
3. **Check selection event handling** - Understand how vim plugin handles selections
4. **Browser differences** - Test if this happens on all platforms (macOS/Windows/Linux)

## Related Files

- `packages/codemirror-vim/src/vim.js` - Main vim plugin implementation
- Cursor rendering logic in the vim plugin (needs investigation)

## Priority

**Low** - This is a cosmetic issue that doesn't affect functionality. Character leaking was the primary blocker, and that's now resolved.

## Next Steps (Optional)

1. File an issue in the `@replit/codemirror-vim` repository
2. Investigate cursor rendering in the vim plugin source
3. Consider implementing Option 3 (convert native selections to Vim commands)

For now, the feature is **usable and working** despite this minor cursor display issue.
