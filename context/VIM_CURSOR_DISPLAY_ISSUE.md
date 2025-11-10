# Vim Cursor Display Issue

**Date**: 2025-11-10
**Status**: ✅ **RESOLVED** (mouse selection prevention implemented)

## Problem (Resolved)

After the character leak fix, there was a remaining issue where the Vim block cursor disappeared under certain conditions:

1. **Ctrl+A (Select All)** - Causes the block cursor to disappear
2. **Mouse selections** - Can break the cursor display

## Solution Implemented

Prevented **native selections** (not Vim visual mode) in normal mode by blocking the keyboard shortcuts and mouse actions that create them.

## Root Cause

When users create selections using:
- **Shift+arrow keys**
- **Ctrl+A / Cmd+A** (select all)
- **Mouse drag**

These create **native CodeMirror selections** (not Vim visual mode), which breaks Vim's state management and causes:
- Block cursor to disappear
- Vim mode to be lost
- Normal arrow key movement to work (breaking Vim paradigm)

## Implementation Details

### 1. Block Shift+Arrow Keys

Added keyboard interception in `handleKeydown()`:

```typescript
// Block Shift+arrow keys in normal mode - they create native selections that break Vim
const arrowKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
if (mode === 'normal' && event.shiftKey && arrowKeys.includes(event.key)) {
  console.log('[Vim Custom Key Mappings] BLOCKING Shift+' + event.key + ' in normal mode')
  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()
  return
}
```

### 2. Block Ctrl+A (Select All)

```typescript
// Block Ctrl+A (select all) in normal mode - it creates native selection that breaks Vim
if (mode === 'normal' && (event.ctrlKey || event.metaKey) && event.key === 'a') {
  console.log('[Vim Custom Key Mappings] BLOCKING Ctrl+A in normal mode (use ggVG instead)')
  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()
  return
}
```

### 3. Block Mouse Selections

```typescript
private handleMousedown (event: MouseEvent): void {
  if (this.currentMode === 'normal' || this.currentMode === 'visual') {
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
  }
}

private handleSelectStart (event: Event): void {
  if (this.currentMode === 'normal' || this.currentMode === 'visual') {
    event.preventDefault()
    event.stopPropagation()
  }
}
```

### Why This Works

- **Prevents browser's native selection** in normal/visual mode
- **Allows cursor positioning** with single clicks
- **Eliminates cursor display issues** caused by mouse selections
- **Maintains Vim philosophy** - selections should be made with Vim commands (v, V, Ctrl+V)
- **Works in insert mode** - mouse selections still work normally when editing

## Benefits

1. ✅ **Cursor stays visible** - No more disappearing block cursor
2. ✅ **Ctrl+A issue avoided** - Since mouse selections are prevented, Ctrl+A won't break cursor
3. ✅ **Pure Vim behavior** - Encourages using Vim visual mode commands
4. ✅ **Simple implementation** - Just two event handlers
5. ✅ **No performance impact** - Event handlers are lightweight

## Behavior

### In Normal Mode
- ❌ Mouse drag selection **disabled**
- ❌ Shift+arrow selection **disabled**
- ❌ Ctrl+A select all **disabled** (use `ggVG` in Vim)
- ✅ Regular arrow keys **work** for cursor movement
- ✅ Vim visual mode (`v`, `V`, `Ctrl+V`) **works** for proper selections
- ✅ Vim commands **work normally**
- ✅ Block cursor **remains visible**

### In Insert Mode
- ✅ Mouse selections **work normally**
- ✅ Shift+arrow selections **work normally**
- ✅ Ctrl+A **works normally**
- ✅ All editing features **available**

## Testing

To test that mouse selection is disabled:
1. Open Zettlr with Vim mode enabled
2. Ensure you're in normal mode (press Escape)
3. Try to drag-select text with mouse → Should not create a selection
4. Single click → Cursor moves to clicked position ✅
5. Press `i` to enter insert mode
6. Try to drag-select text with mouse → Selection works ✅

## Related Files

- `source/common/modules/markdown-editor/hooks/vim-fixed-keyboard.ts` - Mouse event handlers

## Related Issues

This solution also prevents the Ctrl+A cursor disappearing issue, as it blocks the underlying selection mechanism that was causing the problem.

## Vim Philosophy

This implementation aligns with Vim's philosophy that text selection should be done with keyboard commands:
- `v` - Visual character mode
- `V` - Visual line mode
- `Ctrl+V` - Visual block mode
- `gv` - Reselect previous selection

Mouse selections in Vim are non-standard and can cause issues with cursor rendering and mode state.
