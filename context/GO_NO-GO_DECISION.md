# Migration Decision: Zettlr 2.3.0 → 3.6.0/4.0

## Date: 2025-11-08 (Updated: 2025-11-09)

## Decision: **✅ GO - BLOCKER RESOLVED**

## Resolution Summary

**The critical blocker has been resolved!** We found a forked version of `@replit/codemirror-vim` that fixes the Arabic character disconnection issue.

### Solution Implemented

**Forked Vim Plugin**: https://github.com/diraneyya/codemirror-vim/tree/fix/cursor-arabic-connected-characters

- **PR**: https://github.com/replit/codemirror-vim/pull/248
- **Fix**: Properly handles Arabic/RTL character rendering in Vim Normal mode fat cursor
- **Status**: ✅ TESTED AND WORKING - Arabic characters remain 100% connected
- **Integration**: Added to package.json as GitHub dependency

**Changes Made**:
```json
"@replit/codemirror-vim": "github:diraneyya/codemirror-vim#fix/cursor-arabic-connected-characters"
```

**Test Results**:
- ✅ Arabic characters remain 100% connected when cursor is over them
- ✅ No bold/non-bold blinking artifact
- ✅ Cursor visible and functional in Normal mode
- ✅ All Vim commands work correctly
- ✅ No regression for LTR (English) text

---

## Original Issue (NOW RESOLVED)

**Arabic Character Disconnection in CodeMirror 6**

### Issue Summary
- Arabic characters were rendering in disconnected/isolated form when cursor positioned over them
- Additional artifact: Character under cursor blinked between bold and non-bold weight
- **User Requirement**: "Anything less than 100% is not acceptable" - DEAL BREAKER

### Root Cause (Identified)
The `@replit/codemirror-vim` plugin's "fat cursor" feature duplicated characters in an isolated DOM element, breaking Arabic ligature shaping:

1. **Character Duplication**: The fat cursor created a separate `<div>` containing the character at cursor position
2. **Lost Context**: This duplicate element was isolated from surrounding text
3. **Browser Reshaping**: Browser's Arabic text shaper rendered the isolated character in isolated form
4. **Font Weight Changes**: The cursor applied `fontWeight`, causing additional rendering artifacts

**Technical Details**:
- File: `node_modules/@replit/codemirror-vim/dist/index.js`
- Class: `BlockCursorPlugin` (line 8218)
- CSS: `.cm-fat-cursor` (line 8285)
- Character duplication: `Piece` class (line 8193)

### Investigation Timeline

**2025-11-08**: Initial investigation
1. ❌ Attempted CSS-only solutions in theme files - FAILED
2. ❌ Tried cursor style overrides with `!important` - FAILED
3. ✅ Deep investigation revealed Vim plugin as root cause
4. ✅ User confirmed issue exists in plain CodeMirror 6 + Vim demo

**2025-11-09**: Solution found
1. ✅ User discovered forked vim plugin with fix
2. ✅ Integrated forked plugin via GitHub dependency
3. ✅ Tested with Arabic text - **100% WORKING**
4. ✅ **BLOCKER RESOLVED - MIGRATION APPROVED**

---

## Migration Assessment

### What We Achieved
✅ Successfully implemented Vim Fixed Keyboard Layout in Zettlr 2.3.0
✅ 100% Arabic translation coverage in 2.3.0
✅ Identified all necessary code changes for CM6 migration
✅ Created comprehensive migration plan with risk assessment
✅ **Resolved CodeMirror 6 Arabic cursor issue** 🎉
✅ Confirmed forked vim plugin works perfectly

### Previous Blockers (ALL RESOLVED or MITIGATED)
- ✅ **CodeMirror 6 Arabic cursor issue** - RESOLVED via forked vim plugin
- ⚠️ Broken Arabic translations in official 3.6.0 - MITIGATED (we can restore them)
- ⚠️ RTL support removed - MITIGATED (we can re-add from 2.3.0)

### Risk Analysis

**Proceeding with migration**:
- Risk Level: **LOW** (blocker resolved)
- Impact: Access to CM6 features, better performance, modern codebase
- Arabic editing: **100% functional** with forked vim plugin
- Vim-fixed-keyboard: Ready to migrate
- Future-proof: CM6 is actively maintained

**Staying on Zettlr 2.3.0**:
- Risk Level: **MEDIUM** (outdated codebase)
- Impact: Missing CM6 features, potential security/maintenance issues
- No longer necessary since blocker is resolved

---

## New Recommendation

### **✅ GO** for migration

**Reasons**:
1. ✅ The Arabic cursor issue is **RESOLVED** via forked vim plugin
2. ✅ Arabic text rendering is **100% perfect** (tested and confirmed)
3. ✅ Clear path forward for feature migration
4. ✅ Modern codebase with active maintenance
5. ✅ Better foundation for future development

### Migration Plan

**Phase 1: Foundation (Current)**
1. ✅ Integrate forked vim plugin - DONE
2. ✅ Test Arabic text rendering - DONE
3. ⏳ Migrate vim-fixed-keyboard feature from 2.3.0
4. ⏳ Test migrated feature with Arabic text
5. ⏳ Restore Arabic translations if needed

**Phase 2: Testing**
1. ⏳ Comprehensive testing of vim-fixed-keyboard in CM6
2. ⏳ Verify all Vim commands work with keyboard mapping
3. ⏳ Test RTL cursor positioning
4. ⏳ Performance testing

**Phase 3: Polish**
1. ⏳ Update configuration UI if needed
2. ⏳ Update documentation
3. ⏳ Create release notes
4. ⏳ Package and distribute

---

## Immediate Next Steps

1. ✅ Integrated forked vim plugin
2. ✅ Tested Arabic text rendering - **100% WORKING**
3. ✅ Updated migration decision - **GO**
4. ⏳ **Begin vim-fixed-keyboard feature migration**
5. ⏳ Copy implementation from 2.3.0 to 3.6.0
6. ⏳ Test migrated feature thoroughly

---

## Final Notes

After extensive investigation and discovering the proper fix via the forked vim plugin, we can now confidently proceed with migration.

The user's requirement of "anything less than 100% is not acceptable" is **NOW MET**. Arabic characters remain perfectly connected, with no visual artifacts.

**Key Learning**: The issue was in the `@replit/codemirror-vim` plugin, not Zettlr or CodeMirror 6 core. Using the community-contributed fix allows us to move forward.

**Next Priority**: Migrate the vim-fixed-keyboard feature from Zettlr 2.3.0 to 3.6.0, building on this solid foundation.

---

## Appendix: Files Modified

### Zettlr 3.6.0 Changes
- `/Users/orwa/repos/Zettlr-official/package.json` - Updated vim plugin dependency
- `/Users/orwa/repos/Zettlr-official/yarn.lock` - Updated with forked plugin

### Investigation Files (Reverted)
- `/Users/orwa/repos/Zettlr-official/source/common/modules/markdown-editor/theme/main-override.ts` - REVERTED
- `/Users/orwa/repos/Zettlr-official/source/common/modules/markdown-editor/theme/berlin.ts` - REVERTED
- (Other theme files were not modified in final solution)

---

## Documentation

- `ARABIC_CURSOR_ISSUE_ANALYSIS.md` - Technical deep-dive (historical reference)
- `GO_NO-GO_DECISION.md` - This document
- `IMPLEMENTATION_PLAN_CM6_MIGRATION.md` - Comprehensive migration plan

---

**Migration Status**: ✅ **APPROVED - PROCEEDING**
**Blocker Status**: ✅ **RESOLVED**
**Next Phase**: Feature Migration
