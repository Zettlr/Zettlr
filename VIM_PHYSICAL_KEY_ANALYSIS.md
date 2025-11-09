# Critical Discovery: @replit/codemirror-vim Already Has Physical Keyboard Support

**Date**: 2025-11-09
**Status**: 🔴 **URGENT - MAJOR REDUNDANCY DISCOVERED**
**Impact**: Our entire vim-fixed-keyboard.ts plugin is redundant

---

## Executive Summary

**The @replit/codemirror-vim plugin already implements physical keyboard layout mapping as of November 6, 2024** (commit `b391018`). This means:

1. ✅ Both 'j' (English) and 'ت' (Arabic) work as vim down command **without any custom code**
2. ❌ Our `vim-fixed-keyboard.ts` plugin is **completely redundant** for basic navigation
3. ⚠️ Our plugin is **ALWAYS intercepting keys**, even when "disabled", causing conflicts
4. 🎯 We may only need the **trainer UI** for modifier key mappings (like `{`, `}`, etc.)

---

## The Evidence

### 1. User's Test Discovery

The user tested the standalone vim plugin test app (`index.html` in the fork) and discovered that **both 'j' and 'ت' work as vim down command**, even though the fork was only supposed to fix cursor rendering.

This shouldn't be possible unless the vim plugin itself already supports physical key mapping.

### 2. Code Analysis: vimKeyFromEvent Function

**Location**: `/Users/orwa/repos/codemirror-vim-arabic/codemirror-vim/src/vim.js` (lines 1217-1257)

**The Critical Code** (added in commit b391018, Nov 6, 2024):

```javascript
function vimKeyFromEvent(e, vim) {
  var key = e.key;
  // ... modifier handling ...

  if (vim && !vim.expectLiteralNext && key.length == 1) {
    if (langmap.keymap && key in langmap.keymap) {
      // First: Check langmap (vim's :set langmap feature)
      if (langmap.remapCtrl != false || !name)
        key = langmap.keymap[key];
    } else if (key.charCodeAt(0) > 128) {
      // Second: For non-ASCII characters (Arabic, Hebrew, etc.)
      if (!usedKeys[key]) {
        // 🔑 THIS IS THE MAGIC: Use physical key instead of character
        var code = e.code?.slice(-1) || "";  // Get last char of event.code (e.g., "KeyJ" → "J")
        if (!e.shiftKey) code = code.toLowerCase();  // Make it lowercase
        if (code) {
          key = code;  // Replace Arabic 'ت' with 'j'
          // also restore A- for mac
          if (!name && e.altKey) name = 'A-'
        }
      }
    }
  }

  name += key;
  if (name.length > 1) { name = '<' + name + '>'; }
  return name;
}
```

**How it works:**

1. **For ASCII characters (a-z, 0-9, etc.)**: Uses the character as-is
2. **For non-ASCII characters (Arabic ت, Hebrew, etc.)**:
   - Checks `key.charCodeAt(0) > 128` (non-ASCII)
   - Checks if character is NOT in `usedKeys` (characters mapped to vim commands)
   - Extracts last character from `event.code` (e.g., `KeyJ` → `J` → lowercase → `j`)
   - Replaces the non-ASCII character with the physical key letter
3. **Result**: Arabic 'ت' on KeyJ becomes 'j' for vim command processing

### 3. The usedKeys Registry

**Purpose**: Tracks which characters are explicitly mapped in vim keymaps.

- When you do `:map ت something`, the character 'ت' is added to `usedKeys`
- The physical key fallback only applies to **unmapped** non-ASCII characters
- This ensures user's custom mappings aren't overridden

**Code** (lines 6653-6668):

```javascript
function addUsedKeys(keys) {
  keys.split(/(<(?:[CSMA]-)*\w+>|.)/i).forEach(function(part) {
    if (part) {
      if (!usedKeys[part]) usedKeys[part] = 0;
      usedKeys[part]++;
    }
  });
}

function removeUsedKeys(keys) {
  keys.split(/(<(?:[CSMA]-)*\w+>|.)/i).forEach(function(part) {
    if (usedKeys[part])
      usedKeys[part]--;
  });
}
```

### 4. Commit History

**Key commit**: `b391018` - "support both <A-*> and unicode mapping on mac (#194)"
**Date**: November 6, 2024
**Author**: Harutyun Amirjanyan <amirjanyan@gmail.com>

**What changed:**
- Added `usedKeys` registry
- Modified `vimKeyFromEvent` to use `event.code` for non-ASCII chars
- Changed threshold from `charCodeAt(0) > 255` to `charCodeAt(0) > 128` (covers more non-Latin scripts)
- Added support for Alt-key combinations on macOS

**User's fork commit**: `2973aec` - "Fix cursor rendering for Arabic connected characters"
**Date**: November 9, 2025
**Base**: Built on top of `b391018` (already includes physical key support)
**Changes**: Only modified `src/block-cursor.ts` for cursor width/rendering - **did NOT touch key handling**

### 5. Zettlr 3.6.0 Dependency

**From `/Users/orwa/repos/Zettlr-official/package.json`:**

```json
"@replit/codemirror-vim": "github:diraneyya/codemirror-vim#fix/cursor-arabic-connected-characters"
```

**This fork includes:**
- ✅ The physical keyboard mapping feature (from upstream `b391018`)
- ✅ The cursor rendering fix (from user's commit `2973aec`)

---

## Why Our Plugin Appears "Always On"

### The Problem

When testing with the checkbox **UNCHECKED** (feature supposedly disabled):

1. Our `vim-fixed-keyboard.ts` plugin returns early (confirmed via debug output)
2. Yet both 'j' and 'ת' still work as vim down command
3. User thought our code was running even when disabled

### The Explanation

**Our plugin is NOT running when disabled** - but it doesn't matter because:

1. The `@replit/codemirror-vim` plugin's `vimKeyFromEvent` function **always** does physical key mapping for non-ASCII characters
2. This happens **inside the vim plugin**, not in our code
3. There's no configuration option to disable it in the vim plugin

**When checkbox is checked:**
- Our plugin intercepts keys → maps them → passes to vim
- Vim receives the mapped key and processes it
- **Double processing** (both our plugin and vim's built-in mapping)

**When checkbox is unchecked:**
- Our plugin returns early (does nothing)
- Event propagates to CodeMirror/Vim normally
- Vim's `vimKeyFromEvent` does physical key mapping automatically
- Still works!

### Why We Can't Disable It

The vim plugin's physical key mapping is:
- ❌ Not configurable (no option to disable)
- ❌ Not documented (no mention in README/docs)
- ❌ Not toggleable (always active for non-ASCII chars)
- ✅ Built-in behavior since November 2024

---

## Comparison: CodeMirror 5 vs CodeMirror 6

### CodeMirror 5 Vim (Zettlr 2.3.0)

**File**: `codemirror/keymap/vim.js` (version 5.65.3)

**Behavior**: Used `event.key` (character-based):
- Arabic 'ت' would be processed as 'ت', not 'j'
- Vim commands would NOT work with non-Latin keyboards
- **Required our custom keyboard mapping layer**

**Our Solution**: `vim-fixed-keyboard.ts` hook that:
- Intercepted keydown events
- Mapped physical keys to Vim commands
- Could be toggled on/off
- **Was necessary and useful**

### CodeMirror 6 Vim (@replit/codemirror-vim)

**File**: `@replit/codemirror-vim/src/vim.js`

**Behavior**: Uses `event.code` (physical key-based) for non-ASCII:
- Arabic 'ت' is automatically converted to 'j'
- Vim commands work with ALL keyboards out of the box
- **Built-in, always active, cannot be disabled**

**Our Solution**: `vim-fixed-keyboard.ts` that:
- Duplicates what vim plugin already does
- **Is completely redundant for basic navigation**
- Intercepts keys unnecessarily
- Cannot truly be "disabled" because vim's mapping is still active

---

## What Should We Do?

### Option A: Remove All Custom Code (Simplest)

**Action**: Delete the entire vim fixed keyboard feature

**Rationale**:
- The vim plugin already does physical key mapping
- It works automatically for all non-Latin keyboards
- No configuration needed
- Users get the feature "for free"

**Pros**:
- ✅ Simplest solution
- ✅ No maintenance burden
- ✅ No conflicts or double-processing
- ✅ Leverages upstream behavior

**Cons**:
- ❌ Cannot be toggled on/off (always active)
- ❌ Doesn't help with modifier keys like `{`, `}`, `[`, `]` (which require Alt/Ctrl on some keyboards)
- ❌ Loses the training UI feature

**Files to delete**:
- `source/common/modules/markdown-editor/hooks/vim-fixed-keyboard.ts`
- `source/common/modules/markdown-editor/keyboard-layout-mapper.ts`
- Config: `vimFixedKeyboardLayout` boolean

**Files to keep**: None

---

### Option B: Keep Only Trainer UI for Modifier Keys (Recommended)

**Action**: Remove physical key mapping, keep only trained mappings for special characters

**Rationale**:
- Vim's built-in mapping handles h/j/k/l/w/b/etc. automatically
- Users still need help with `{`, `}`, `[`, `]` which require Alt/Ctrl modifiers on some keyboards
- Trainer UI is useful for these special cases

**Pros**:
- ✅ Removes redundant code
- ✅ Keeps valuable trainer UI
- ✅ Focused on real user pain point (modifier keys)
- ✅ Can still be toggled (for trained mappings only)

**Cons**:
- ⚠️ More complex than Option A
- ⚠️ Need to update UI/docs to clarify scope

**Implementation**:

1. **Update `vim-fixed-keyboard.ts`**:
   - Remove physical key mapping logic (lines 149-177)
   - Keep only trained mapping logic (lines 122-147)
   - Update comments/docs to clarify this is ONLY for modifier keys

2. **Update UI**:
   - Rename checkbox: "Enable trained key mappings for Vim mode"
   - Update help text: "Train modifier key combinations for special characters like {, }, [, ] that may require Alt/Ctrl on your keyboard"
   - Make it clear this is NOT for basic navigation (which works automatically)

3. **Keep files**:
   - ✅ `source/common/modules/markdown-editor/hooks/vim-fixed-keyboard.ts` (simplified)
   - ✅ `source/common/vue/form/elements/VimKeyMappingTrainer.vue` (trainer UI)
   - ✅ Config: `vimKeyMappings` (trained mappings)

4. **Delete files**:
   - ❌ `source/common/modules/markdown-editor/keyboard-layout-mapper.ts` (redundant)
   - ❌ Config: `vimFixedKeyboardLayout` boolean (rename to `vimEnableTrainedMappings`)

---

### Option C: Make Vim Plugin Behavior Configurable (Ambitious)

**Action**: Contribute to upstream @replit/codemirror-vim to add configuration option

**Rationale**:
- Some users might want to disable physical key mapping
- Gives users full control
- Benefits the entire community

**Pros**:
- ✅ Most flexible
- ✅ Helps all vim users, not just Zettlr
- ✅ Preserves all our work

**Cons**:
- ❌ Requires upstream contribution
- ❌ May be rejected (maintainers might see it as unnecessary)
- ❌ Timeline uncertain
- ❌ More complex to maintain

**Implementation**:

1. Add configuration to `@replit/codemirror-vim`:
   ```javascript
   vim.setOption('physicalKeyMapping', true/false)
   ```

2. Modify `vimKeyFromEvent`:
   ```javascript
   if (vim.options.physicalKeyMapping && key.charCodeAt(0) > 128) {
     // Do physical key mapping
   }
   ```

3. Update our code to use this option

4. Submit PR to upstream

---

## Recommended Path Forward

### Phase 1: Immediate (This Week)

**Decision Point**: Choose between Option A (simple) or Option B (trainer UI)

**My Recommendation**: **Option B - Keep Trainer UI**

**Reasoning**:
1. Physical key mapping works automatically (no code needed)
2. Modifier keys (`{`, `}`, etc.) still need custom training
3. Trainer UI has real value
4. Can always simplify to Option A later if trainer proves unused

**User Input Needed**:
- Do you use modifier key characters like `{`, `}`, `[`, `]` in Vim?
- Is the trainer UI valuable for these cases?
- Or should we just remove everything (Option A)?

### Phase 2: Implementation (After Decision)

**If Option A (Remove All)**:
1. Delete `vim-fixed-keyboard.ts`
2. Delete `keyboard-layout-mapper.ts`
3. Remove config options
4. Remove UI checkbox
5. Update documentation
6. Test that vim still works correctly

**If Option B (Keep Trainer)**:
1. Simplify `vim-fixed-keyboard.ts` (remove physical key mapping)
2. Delete `keyboard-layout-mapper.ts`
3. Update config (rename/clarify)
4. Update UI (new checkbox text, clarified help)
5. Update documentation
6. Test trainer UI with modifier keys

### Phase 3: Documentation

**Update `VIM_FIXED_KEYBOARD_EXPLANATION.md`** to explain:
- ✅ Basic navigation (h/j/k/l/w/b/etc.) works automatically in @replit/codemirror-vim
- ✅ No configuration needed for basic vim commands
- ✅ (If Option B) Trainer UI available for modifier key characters
- ✅ How the vim plugin's built-in mapping works

---

## Technical Details for Developers

### How @replit/codemirror-vim Does Physical Key Mapping

**Flow**:

1. User presses key (e.g., Arabic ت on KeyJ)
2. Browser fires `keydown` event:
   - `event.key = "ت"` (character)
   - `event.code = "KeyJ"` (physical key)
3. CodeMirror intercepts event
4. Vim plugin's `vimKeyFromEvent` is called:
   - Checks `key.charCodeAt(0) > 128` (true for ت)
   - Checks `!usedKeys[key]` (true if ت not mapped)
   - Extracts `e.code.slice(-1)` → "J"
   - Lowercases if no Shift → "j"
   - Returns "j" instead of "ت"
5. Vim processes "j" command (move down)

### Why Our Plugin Can't "Disable" This

Even when we return early in `vim-fixed-keyboard.ts`:

1. Our plugin does nothing (correct)
2. Event propagates to CodeMirror
3. Vim plugin's `vimKeyFromEvent` still runs (built-in, always active)
4. Physical key mapping still happens
5. Vim command still executes

**There is no way to disable the vim plugin's built-in mapping without forking it.**

### Edge Case: usedKeys Registry

If a user does `:map ت <something>` in Vim:
- Character 'ت' is added to `usedKeys`
- `vimKeyFromEvent` sees `usedKeys["ت"]` is truthy
- Physical key mapping is skipped
- User's custom mapping takes precedence

This is correct behavior - user mappings should override defaults.

---

## Questions for User

Before we proceed, please answer:

1. **Do you want the trainer UI for modifier keys (`{`, `}`, etc.)?**
   - Yes → Option B (keep trainer)
   - No → Option A (remove all)

2. **Do you ever use `:map` commands to customize Vim keybindings?**
   - Important for understanding `usedKeys` behavior

3. **Should basic navigation "just work" without any configuration?**
   - That's what the vim plugin now provides

4. **Is there any reason to keep the ability to "toggle" physical key mapping?**
   - Given that vim's built-in mapping is always active

5. **Have you tested other special Vim commands (like `gg`, `G`, `dd`, `ciw`, etc.) with Arabic keyboard?**
   - Do they all work automatically?

---

## Testing Checklist

Before finalizing any changes, test:

- [ ] Basic navigation (h/j/k/l) with Arabic keyboard - UNCHECKED
- [ ] Word motion (w/b/e) with Arabic keyboard - UNCHECKED
- [ ] Visual mode (v) with Arabic keyboard - UNCHECKED
- [ ] Delete commands (dd/dw/d$) with Arabic keyboard - UNCHECKED
- [ ] Change commands (cc/cw/ciw) with Arabic keyboard - UNCHECKED
- [ ] Modifier key characters (if keeping trainer):
  - [ ] { and } on Arabic keyboard
  - [ ] [ and ] on Arabic keyboard
  - [ ] ( and ) on Arabic keyboard
- [ ] Verify checkbox (if kept) correctly enables/disables trainer mappings
- [ ] Verify NO double-processing of keys
- [ ] Test with other non-Latin keyboards (Hebrew, Russian, etc.)

---

## Conclusion

**Bottom Line**: The @replit/codemirror-vim plugin has had built-in physical keyboard mapping since November 6, 2024. Our custom implementation is redundant for basic navigation and cannot truly be "disabled" because the vim plugin's mapping is always active.

**Recommended Action**: Keep only the trainer UI for modifier key characters (Option B), or remove all custom code (Option A). Either way, acknowledge that basic vim navigation works automatically now.

**Next Step**: User decision on which option to pursue.

---

**Document Version**: 1.0
**Created**: 2025-11-09
**Author**: Claude Code (Analysis)
**Reviewed By**: [Pending User Review]
