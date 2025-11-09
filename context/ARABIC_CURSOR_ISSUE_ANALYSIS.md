# Arabic Character Disconnection Issue - Technical Analysis

## ✅ RESOLVED (2025-11-09)

**Solution**: Forked vim plugin with fix for Arabic character rendering
**Status**: ✅ TESTED AND WORKING

---

## Problem Statement

When the cursor is positioned over Arabic characters in Zettlr 3.6.0 (CodeMirror 6) with Vim mode enabled, the characters rendered in their disconnected/isolated form instead of the connected form. Additionally, there was a blinking bold/non-bold effect on the character under the cursor.

**Impact**: DEAL BREAKER - Made the editor unusable for Arabic writing
**User Requirement**: "Anything less than 100% is not acceptable"

---

## Resolution

### Solution Found

**Forked Vim Plugin**: https://github.com/diraneyya/codemirror-vim/tree/fix/cursor-arabic-connected-characters
- **PR**: https://github.com/replit/codemirror-vim/pull/248
- **Author**: @diraneyya (community contributor)
- **Fix**: Proper handling of Arabic/RTL characters in fat cursor

### Implementation

Updated package.json:
```json
"@replit/codemirror-vim": "github:diraneyya/codemirror-vim#fix/cursor-arabic-connected-characters"
```

### Test Results

✅ Arabic characters remain 100% connected when cursor is over them
✅ No bold/non-bold blinking artifact
✅ Cursor visible and functional in Normal mode
✅ All Vim commands work correctly (h, j, k, l, w, b, dw, etc.)
✅ No regression for LTR (English) text editing

---

## User Observations (Historical)

1. **Character Disconnection**: Arabic letters like ح in the word "نحن" appeared isolated when cursor was over them
2. **Blinking Artifact**: The character under the cursor blinked between bold and non-bold weight
3. **Comparison with Other Editors**:
   - ✅ VS Code: Uses thin vertical line cursor (|) - **NO Arabic disconnection**
   - ❌ Obsidian: Uses block/box cursor (█) - **HAD Arabic disconnection** (before their fix)
   - ❌ Zettlr 3.6.0 (before fix): Uses block/box cursor (█) - **HAD Arabic disconnection**
   - ✅ Zettlr 3.6.0 (after fix): Uses forked vim plugin - **NO Arabic disconnection**

---

## Root Cause Analysis

### The Fat Cursor Mechanism

The `@replit/codemirror-vim` plugin implements a "fat cursor" (block cursor) for Normal and Visual modes. The original implementation broke Arabic text shaping.

**File**: `node_modules/@replit/codemirror-vim/dist/index.js` (original version)

**How it broke Arabic text** (lines 8323-8373):

```javascript
// Line 8324: Extract the character at cursor position
let letter = head < view.state.doc.length && view.state.sliceDoc(head, head + 1);

// Line 8373: Create a NEW DOM element with that character
return new Piece(..., style.fontWeight, ..., letter, ...)

// Line 8193-8208: The Piece renders as a separate <div>
draw() {
    let elt = document.createElement("div");
    elt.className = this.className;
    elt.textContent = this.letter;  // THE PROBLEM!
    return elt;
}
```

**Why this broke Arabic**:

1. **Character Isolation**: The fat cursor created a **duplicate DOM element** containing the character under the cursor
2. **Lost Context**: This duplicate element was **isolated from surrounding text**, breaking the Arabic ligature shaping context
3. **Browser Reshaping**: The browser's Arabic text shaper (HarfBuzz) saw a single character in isolation, so it rendered it in **isolated form** instead of **medial/initial/final form**
4. **Font Weight Changes**: The cursor applied `fontWeight` (line 8373), causing additional rendering changes (bold overlay)

**CSS Applied** (lines 8285-8296):

```css
.cm-fat-cursor {
    position: absolute;
    background: #ff9696;
    border: none;
    whiteSpace: "pre",
}
```

This confirmed the cursor was an **absolutely positioned overlay** with the character duplicated inside it.

---

## Investigation History

### What We Tried (FAILED)

**Attempt 1: CSS-only solution via themes**
- Modified theme files to change cursor from `background: color` to `borderLeft: 1.5px solid`
- Added `width: '0'` to make it a line cursor
- **Result**: Vertical line appeared briefly, then disappeared; blinking bold/non-bold artifact persisted

**Why It Failed**:
- Modifying cursor via theme CSS was fundamentally flawed
- CodeMirror 6 + Vim plugin had its own cursor rendering mechanism that overrode theme styles
- The blinking artifact was from the duplicated character, not fixable via CSS

**Attempt 2: Hide native browser caret**
- Added `caretColor: 'transparent'` to hide native caret
- **Result**: Made the issue worse with Latin characters; didn't solve Arabic issue

**Why It Failed**:
- The problem wasn't the native caret, but the Vim plugin's fat cursor character duplication

**Attempt 3: Transparent fat cursor character**
- Attempted to make the duplicated character transparent via CSS
- **Result**: Partial solution, but not ideal
- **Why Abandoned**: Found proper fix via forked plugin instead

### What Worked ✅

**Solution: Forked Vim Plugin**
- User discovered community-contributed fork with proper fix
- Integrated via GitHub dependency in package.json
- **Result**: **100% PERFECT** - Arabic text remains fully connected with no artifacts

---

## Architecture Issues Identified

1. **Cursor Styling via Themes is Bad Design**:
   - Cursor rendering is a functional concern, not a visual theme concern
   - Should be configured at the editor initialization level, not per-theme
   - Original approach required modifying 5+ theme files for a functional change

2. **Fat Cursor Character Duplication**:
   - Creating isolated DOM elements for cursor characters breaks complex text shaping
   - Affects Arabic, Hebrew, and other scripts with contextual forms
   - Better approach: Use visual markers without character duplication (as implemented in fork)

---

## Key Learning

### The Real Issue

The problem was **NOT in Zettlr or CodeMirror 6 core**, but in the `@replit/codemirror-vim` plugin's fat cursor implementation.

### Community Solution

The open-source community (specifically @diraneyya) identified and fixed this issue. The fix was available via:
- GitHub fork: https://github.com/diraneyya/codemirror-vim
- Pull Request: https://github.com/replit/codemirror-vim/pull/248

### Comparison with Obsidian

Obsidian users reported the **exact same issue** in their forum:
- **Post**: "Vim mode + RTL language - wrong character blinks"
- **Status**: "Solved upstream" as of June 26, 2024
- This confirmed the issue was in the vim plugin, not application-specific

---

## Technical Details

### Vim Plugin Architecture

**BlockCursorPlugin** (line 8218 in original): Creates and manages the cursor overlay
**measureCursor()** (line 8303): Determines when to show the fat cursor
**Piece class** (line 8180): Represents the visual cursor element

### How The Fork Fixed It

The forked version properly handles Arabic/RTL character rendering without breaking ligature shaping. The exact implementation details are in the PR #248.

---

## Success Criteria Met

- ✅ Arabic characters remain 100% connected when cursor is over them in Vim Normal mode
- ✅ No visual artifacts (bold/non-bold blinking, disconnection, etc.)
- ✅ Cursor is visible and functional
- ✅ Solution works across all themes
- ✅ Solution is maintainable (uses community-maintained fork)
- ✅ All Vim functionality preserved

---

## Migration Impact

**Before Fix**: Migration to Zettlr 3.6.0 was **NO-GO** due to this critical blocker

**After Fix**: Migration to Zettlr 3.6.0 is **✅ APPROVED** - blocker resolved

**Next Steps**: Proceed with vim-fixed-keyboard feature migration from 2.3.0 to 3.6.0

---

## Files Modified

### Zettlr 3.6.0 Changes (Final)
- `/Users/orwa/repos/Zettlr-official/package.json` - Updated vim plugin to forked version
- `/Users/orwa/repos/Zettlr-official/yarn.lock` - Updated lock file

### Attempted Fixes (Reverted)
- `/Users/orwa/repos/Zettlr-official/source/common/modules/markdown-editor/theme/main-override.ts` - REVERTED
- `/Users/orwa/repos/Zettlr-official/source/common/modules/markdown-editor/theme/berlin.ts` - REVERTED
- (Other theme files were not modified in final solution)

---

## Conclusion

The Arabic character disconnection issue in Vim Normal mode has been **fully resolved** using a community-contributed forked vim plugin.

This demonstrates the value of:
1. **Open-source collaboration** - Community identified and fixed the issue
2. **Thorough investigation** - Identified root cause in vim plugin, not Zettlr
3. **GitHub dependencies** - Ability to use forked packages while waiting for upstream merge
4. **User testing** - Confirmed the fix works 100% with real Arabic text

**Status**: ✅ RESOLVED
**Migration Status**: ✅ APPROVED TO PROCEED
