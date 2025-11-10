# Vim Character Leak - Architectural Analysis & Root Cause Investigation

**Date**: 2025-11-10
**Status**: Critical Review
**Author**: Senior Software Architect (Claude Code)

---

## Executive Summary

The Vim Fixed Keyboard Layout feature has been experiencing a **recurring cycle of fixes and regressions** with character leaking. This document provides a comprehensive architectural review and identifies **fundamental design flaws** that explain why previous solutions have failed.

**Key Finding**: The current implementation makes **incorrect assumptions about the CodeMirror 6 + Vim plugin event processing order** and attempts to solve the problem at the wrong architectural layer.

---

## Problem Statement

### Observed Symptoms

1. **Character Leaking**: Typing in normal mode inserts unwanted characters (letters, S, Enter)
2. **Over-blocking**: Some fixes break legitimate vim commands (h/j/k/l movement)
3. **Inconsistent Behavior**: Some keys work correctly, others leak characters
4. **Mode Detection Issues**: Cursor display inconsistencies and mode synchronization problems

### Fix Attempt History

1. **ContentEditable Toggle** (`VIM_CHARACTER_LEAK_FIX.md`) - ❌ FAILED
   - Disabled `EditorView.editable.of(false)` in normal mode
   - Result: Completely broke vim movement commands
   - Reason: CodeMirror needs contenteditable for keyboard event processing

2. **Input Event Prevention** (`VIM_CHARACTER_LEAK_PRELIMINARY_FIX.md`) - ⚠️ PARTIAL
   - Intercepted `beforeinput` and `input` events
   - Result: Fixed letter leaking, but Enter still leaks
   - Issues: Cursor display problems, incomplete inputType coverage

3. **Current Implementation** (`vim-fixed-keyboard.ts`) - ⚠️ UNSTABLE
   - Combines input event prevention with keydown interception
   - Complex logic with multiple guard clauses
   - Inconsistent behavior across different key types

---

## Fundamental Architectural Issues

### Issue #1: Incorrect Understanding of Event Flow

**Current Assumption**: Events flow in this order:
```
Browser KeyDown → Document Capture → CodeMirror → Vim Plugin → Input Events
```

**Reality** (based on CodeMirror 6 architecture):
```
Browser KeyDown (capture)
    ↓
Document KeyDown (capture)  ← Current implementation intercepts HERE
    ↓
[RACE CONDITION ZONE]
    ↓
CodeMirror InputState.handleKey()
    ├→ Vim Plugin keymap handlers (if installed)
    ├→ Default keymaps
    └→ contenteditable input processing
    ↓
BeforeInput event fires (AFTER vim has already decided)
    ↓
Input event fires (too late - character already inserted)
```

**The Problem**: The current implementation intercepts at the **document keydown capture phase**, which is:
- **Too early** for input event prevention (those fire later)
- **Too late** for reliable vim command detection (vim hasn't processed yet)
- **Wrong layer** for distinguishing vim-handled vs unhandled keys

### Issue #2: Misunderstanding of Vim Plugin Key Processing

**Current Assumption**:
- Vim plugin processes keys and "consumes" them
- If vim doesn't consume, the key falls through to contenteditable
- We can detect which keys vim handled

**Reality**:
- Vim plugin registers **keymaps** with CodeMirror
- CodeMirror runs ALL keymaps and checks if any return `true` (handled)
- By the time beforeinput/input fires, vim has ALREADY executed its command
- **No reliable way to detect "vim will handle this"** before processing

**Critical Insight**: The `@replit/codemirror-vim` plugin doesn't prevent contenteditable - it **adds keymaps on top of it**. This means:
1. Contenteditable remains active in ALL modes
2. Browser native input happens UNLESS vim's keymap explicitly prevents it
3. There's a race between vim's keymap execution and browser input processing

### Issue #3: The Trained Mappings Approach is Fundamentally Different

**For Trained Mappings** (Alt+8 → "{"):
- Work correctly because: explicit preventDefault() + Vim.handleKey()
- Clear ownership: our code handles the key entirely
- No race condition: we prevent default BEFORE any processing

**For Basic Vim Commands** (j, k, h, l):
- Handled by vim plugin's internal keymaps
- We DON'T intercept them (intentionally)
- Vim plugin is supposed to prevent default... but doesn't always

**The Mismatch**:
- Trained mappings: Our code owns the key lifecycle
- Basic commands: Vim plugin owns the key lifecycle
- **Problem**: Vim plugin doesn't reliably prevent contenteditable input for ALL vim commands

### Issue #4: Character Leak Prevention Targets Wrong Events

**Current Approach**: Prevent `beforeinput` and `input` events in normal mode

**Why This Fails**:

1. **Too Late in Pipeline**: By the time these events fire, vim has already executed
2. **Breaks vim's Own Input Needs**: Some vim commands legitimately need input events
3. **Incomplete Coverage**: Not all input types are caught (e.g., insertLineBreak for Enter)
4. **Mode Sync Issues**: `this.currentMode` may lag behind actual vim state

**Example Failure Case - Enter Key**:
```javascript
handleBeforeInput(event: InputEvent) {
  if (this.currentMode === 'normal' || this.currentMode === 'visual') {
    const allowedInputTypes = [
      'insertCompositionText',
      'deleteCompositionText'
    ]

    if (!allowedInputTypes.includes(event.inputType)) {
      event.preventDefault()  // Should catch Enter...
    }
  }
}
```

**Why Enter Still Leaks**:
- Enter's inputType is `insertLineBreak` or `insertParagraph`
- Code should catch this... but mode detection might be out of sync
- Or vim keymap for Enter doesn't prevent default properly
- Race condition: mode changed but `this.currentMode` not updated yet

---

## Root Cause Analysis

### The Core Problem

**The @replit/codemirror-vim plugin has a known bug**: It does NOT properly prevent contenteditable input in normal mode for all keys.

**Evidence**:
- Mentioned in `VIM_CHARACTER_LEAK_FIX.md`:
  - Issue #178: "Random input in normal mode with IME" (OPEN)
  - Issue #159: "Dead key input treated as insertion in normal mode" (OPEN)
  - Issue #238: Multi-key mapping causes character deletion (OPEN)

**Why Our Workarounds Keep Failing**:
1. We're trying to fix a **vim plugin bug** at the **application layer**
2. We don't have access to vim's internal "will handle this key" decision
3. Event timing makes it impossible to reliably intercept AFTER vim decides but BEFORE contenteditable processes

### The Timing Dilemma

```
OPTION A: Intercept early (keydown capture)
  ✅ Can prevent ALL input
  ❌ Don't know if vim will handle the key yet
  ❌ Risk blocking keys vim needs

OPTION B: Intercept late (beforeinput/input)
  ✅ Vim has already executed its command
  ❌ Too late to prevent some input types
  ❌ Mode detection can lag
  ❌ Incomplete inputType coverage

OPTION C: Selectively prevent specific keys
  ✅ Surgical approach
  ❌ Requires maintaining a list of "problematic keys"
  ❌ Breaks when vim adds new commands
  ❌ Fragile and unmaintainable
```

**Current implementation tries ALL THREE**: Early interception for trained mappings, late prevention for character leaks, selective blocking based on mode. This complexity is a red flag.

---

## Why Previous Solutions Failed

### Solution 1: ContentEditable Toggle
**Approach**: Disable contenteditable in normal mode

**Failed Because**:
- CodeMirror's InputState REQUIRES contenteditable to process keyboard events
- Disabling it breaks the entire event pipeline
- Vim commands never reach the vim plugin

**Lesson**: Can't disable contenteditable without breaking CodeMirror

### Solution 2: Input Event Prevention
**Approach**: Keep contenteditable, prevent input events in normal mode

**Partial Success Because**:
- Catches most character insertion
- Allows keydown events to reach vim

**Still Fails Because**:
- Doesn't catch all inputTypes (missing insertLineBreak, etc.)
- Mode detection can lag
- Race conditions between mode changes and input events

**Lesson**: Preventing input events is closer to correct, but incomplete

### Solution 3: Current Complex Implementation
**Approach**: Hybrid of keydown interception + input prevention + mode tracking

**Issues**:
- **Too Complex**: Multiple layers of guards and handlers
- **Race Conditions**: Mode tracking via keydown can lag behind actual vim state
- **Incomplete**: Still misses some cases (Enter, S)
- **Fragile**: Depends on perfect timing and mode synchronization

**Lesson**: Complexity is a symptom of solving the wrong problem

---

## The Missing Pieces

### What We Don't Know

1. **Vim Plugin Internal Decision Making**:
   - How does vim decide "I'll handle this key"?
   - Is there a pre-processing hook we can use?
   - Can we query "will vim handle this key" before it executes?

2. **CodeMirror Event Processing Order**:
   - Exact sequence: keymaps → default handlers → contenteditable
   - When do keymaps run relative to keydown event propagation?
   - How does InputState coordinate between keymaps and DOM events?

3. **Vim Mode Transitions**:
   - When exactly does mode change fire relative to key processing?
   - Is there a delay between vim's internal mode change and the event?
   - Can rapid key presses cause mode detection to lag?

4. **ContentEditable Behavior**:
   - Which keys trigger input events in which browsers?
   - Are there keys that bypass beforeinput?
   - Platform differences (Windows/Mac/Linux)?

### What We Need to Discover

1. **Reliable Vim "Handled" Detection**:
   - Post-processing hook that tells us "vim handled this"
   - Or pre-processing hook that tells us "vim will handle this"

2. **Complete InputType Enumeration**:
   - All inputTypes that can insert content
   - Platform-specific variations
   - Edge cases (IME, dead keys, special characters)

3. **Mode Synchronization**:
   - How to ensure `this.currentMode` is ALWAYS in sync with vim's actual mode
   - Whether mode-change event is synchronous or asynchronous

4. **Vim Plugin Source Code Analysis**:
   - How does vim's keymap prevent contenteditable input?
   - Why does it fail for some keys (Enter, S)?
   - Can we patch the vim plugin itself?

---

## Experimental Design Recommendations

### Experiment 1: Complete Event Flow Mapping

**Goal**: Understand EXACT order and timing of all events

**Method**:
1. Use the existing `vim-event-logger.ts` (already created)
2. Test specific problematic keys: `j`, `k`, `Enter`, `S`, `i`, `Escape`
3. Capture timestamps at microsecond precision
4. Monitor:
   - Browser keydown (capture + bubble)
   - CodeMirror InputState.handleKey
   - Vim mode state changes
   - BeforeInput/Input events
   - Final document mutations

**Expected Output**: Timeline showing exactly when each component processes each key

**Success Metric**: Identify the "decision point" where vim determines handling

### Experiment 2: Vim Plugin Introspection

**Goal**: Find reliable vim "handled" detection

**Method**:
1. Monkey-patch vim's handleKey function
2. Log what vim returns (true/false)
3. Correlate with character leak occurrence
4. Test if we can query vim BEFORE it processes a key

**Code Approach**:
```javascript
const originalHandleKey = Vim.handleKey
Vim.handleKey = function(cm, key, origin) {
  console.log('[VIM] BEFORE handleKey:', key, origin)
  const result = originalHandleKey.call(this, cm, key, origin)
  console.log('[VIM] AFTER handleKey:', key, 'result:', result)
  return result
}
```

**Expected Output**: Understanding of vim's return values and when it "handles" keys

### Experiment 3: InputType Enumeration

**Goal**: Complete list of all inputTypes that leak characters

**Method**:
1. Setup keyboard listener that logs ALL inputTypes in normal mode
2. Test systematically:
   - All letter keys
   - All special keys (Enter, Space, Tab)
   - Modifier combinations
   - Non-Latin keyboards (Arabic, Hebrew)
3. Document which inputTypes appear for which keys

**Expected Output**: Comprehensive inputType coverage list

### Experiment 4: Mode Synchronization Testing

**Goal**: Verify mode detection reliability

**Method**:
1. Rapid key sequence testing: `i[type]Esc[move]i[type]Esc`
2. Log: vim-mode-change event timing vs actual vim state
3. Test if `this.currentMode` ever lags
4. Measure delay between vim's internal mode change and our detection

**Expected Output**: Quantify mode detection lag and identify race conditions

### Experiment 5: Vim Plugin Source Code Review

**Goal**: Understand why vim doesn't prevent contenteditable for all keys

**Method**:
1. Review `@replit/codemirror-vim` source in `packages/codemirror-vim`
2. Find keymap definitions for problematic keys (Enter, S)
3. Identify why they don't prevent default
4. Determine if we can patch the vim plugin

**Expected Output**: Understanding of vim plugin limitations and patch opportunities

---

## Recommended Experimental Workflow

### Phase 1: Data Collection (Week 1)

**Day 1-2**: Event Flow Mapping
- Run Experiment 1 with existing logger
- Test 10-15 key combinations
- Document complete event sequences

**Day 3-4**: Vim Introspection
- Run Experiment 2 with monkey-patching
- Correlate vim return values with leaks
- Test if pre-query is possible

**Day 5**: InputType Enumeration
- Run Experiment 3 systematically
- Create comprehensive inputType list
- Test cross-platform differences

### Phase 2: Analysis & Hypothesis (Week 2)

**Day 1-2**: Data Analysis
- Review all logs and findings
- Identify patterns and anomalies
- Form updated hypotheses

**Day 3**: Mode Synchronization Testing
- Run Experiment 4
- Quantify race condition frequency
- Determine if this is a primary issue

**Day 4-5**: Vim Plugin Review
- Run Experiment 5
- Review vim plugin source
- Evaluate patch feasibility

### Phase 3: Solution Design (Week 2)

**Day 6-7**: Design Review
- Based on findings, design new approach
- Evaluate options:
  - **Option A**: Patch vim plugin upstream
  - **Option B**: Complete inputType prevention
  - **Option C**: Vim wrapper with reliable handling detection
  - **Option D**: Hybrid approach with robust safeguards
- Document trade-offs and recommendations

---

## Hypotheses to Validate/Invalidate

### Hypothesis 1: "Mode Detection Lag Causes Leaks"
**Test**: Experiment 4
**Expected**: If true, rapid mode changes will show `this.currentMode !== vim.state.mode`
**Implication**: Need synchronous mode detection or different approach

### Hypothesis 2: "Vim Plugin Doesn't Prevent Default for All Keys"
**Test**: Experiment 2 + 5
**Expected**: Vim.handleKey returns `true` but input events still fire
**Implication**: Need to patch vim plugin or add our own preventDefault

### Hypothesis 3: "Missing InputTypes Allow Character Leaks"
**Test**: Experiment 3
**Expected**: Enter uses inputType not in our allowlist
**Implication**: Extend inputType coverage in handleBeforeInput

### Hypothesis 4: "Race Between Keymaps and Input Events"
**Test**: Experiment 1
**Expected**: Input event fires before vim keymap completes
**Implication**: Need different interception point or timing strategy

### Hypothesis 5: "ContentEditable Has Platform-Specific Behavior"
**Test**: Experiment 3 on multiple platforms
**Expected**: Different inputTypes or event ordering on Windows/Mac/Linux
**Implication**: Need platform-specific handling

---

## Immediate Action Items

### Before Starting Experiments

1. **Enable Event Logger**:
   - Uncomment `createVimEventLogger()` in `index.ts`
   - Ensure logger is attached to editor instance
   - Verify console logging works

2. **Create Test Protocol**:
   - Document exact key sequences to test
   - Prepare data collection templates
   - Setup log export functionality

3. **Baseline Testing**:
   - Test current implementation thoroughly
   - Document ALL failure cases
   - Capture video of character leak behavior

### During Experiments

1. **Systematic Logging**:
   - Save all logs to `/Users/orwa/repos/Zettlr-official/logs/`
   - Use timestamp-based filenames
   - Export JSON for programmatic analysis

2. **Progressive Disclosure**:
   - Start with simplest cases
   - Build complexity gradually
   - Stop if fundamental assumption is invalidated

3. **Collaborative Review**:
   - Share findings incrementally
   - Discuss unexpected results immediately
   - Adjust experiment plan based on learnings

---

## Alternative Architectural Approaches

### Approach A: Vim Plugin Fork with Full ContentEditable Control

**Concept**: Fork `@replit/codemirror-vim` and add proper contenteditable disabling

**Pros**:
- ✅ Fixes root cause
- ✅ Robust and maintainable
- ✅ No workarounds needed

**Cons**:
- ❌ Requires maintaining vim plugin fork
- ❌ Complex to implement
- ❌ May break existing vim behavior

**Effort**: High (2-4 weeks)

### Approach B: Complete Input Event Blacklist

**Concept**: Prevent ALL input events in normal mode, none in insert mode

**Pros**:
- ✅ Simple and clear
- ✅ No mode detection lag issues
- ✅ Complete coverage

**Cons**:
- ❌ May prevent legitimate vim input needs
- ❌ Requires extensive testing
- ❌ Edge cases (IME, composition events)

**Effort**: Medium (1-2 weeks)

### Approach C: Vim Command Wrapper Layer

**Concept**: Intercept ALL keys, decide handling, then delegate to vim

**Pros**:
- ✅ Full control over event lifecycle
- ✅ Can add custom logic per key
- ✅ Clear ownership

**Cons**:
- ❌ Requires reimplementing vim's key routing logic
- ❌ Complex and error-prone
- ❌ Breaks vim plugin updates

**Effort**: Very High (4-6 weeks)

### Approach D: Selective Key Interception with Robust Guards

**Concept**: Maintain list of "problematic keys", intercept only those

**Pros**:
- ✅ Surgical approach
- ✅ Minimal impact on vim behavior
- ✅ Easy to adjust

**Cons**:
- ❌ Fragile - depends on knowing all problem keys
- ❌ Doesn't scale to new vim commands
- ❌ Platform-specific differences

**Effort**: Low (1 week)

### Approach E: Upstream Contribution

**Concept**: Fix `@replit/codemirror-vim` upstream and use official version

**Pros**:
- ✅ Benefits entire community
- ✅ Official support
- ✅ No maintenance burden

**Cons**:
- ❌ Depends on upstream acceptance
- ❌ Long feedback cycle
- ❌ May take months

**Effort**: High (varies)

---

## Recommended Path Forward

### Short-Term (Immediate)

1. **Run Experiments 1-3** to gather critical data
2. **Validate/Invalidate key hypotheses**
3. **Identify root cause** with evidence

### Medium-Term (Based on Findings)

**If Hypothesis 3 is correct** (Missing InputTypes):
- Extend handleBeforeInput with complete inputType coverage
- Test thoroughly on all platforms
- Ship as hotfix

**If Hypothesis 2 is correct** (Vim Plugin Bug):
- Evaluate Approach A (Fork) vs Approach E (Upstream)
- Patch vim plugin locally
- Test with Arabic keyboard

**If Hypothesis 1 is correct** (Mode Lag):
- Implement synchronous mode detection
- Use vim-mode-change event more reliably
- Add mode consistency checks

### Long-Term (Sustainable Solution)

1. **Contribute upstream** to `@replit/codemirror-vim`
2. **Maintain local fork** until upstream merge
3. **Document architecture** for future maintainers
4. **Add regression tests** for character leak scenarios

---

## Success Criteria

### Experimental Phase Success

- [ ] Complete event flow map for all test keys
- [ ] Identified reliable vim "handled" detection method
- [ ] Comprehensive inputType enumeration
- [ ] Quantified mode synchronization lag
- [ ] Reviewed vim plugin source and identified issues

### Solution Implementation Success

- [ ] No character leaks in normal mode (any key, any keyboard)
- [ ] All vim commands work correctly (h/j/k/l/i/a/o/etc.)
- [ ] Insert mode typing works normally
- [ ] Mode transitions are immediate and correct
- [ ] Solution is maintainable and well-documented
- [ ] Cross-platform compatibility (Windows/Mac/Linux)
- [ ] Works with non-Latin keyboards (Arabic, Hebrew, etc.)

---

## Conclusion

The character leak issue is **not a simple bug** - it's a **fundamental architectural mismatch** between:
1. How CodeMirror 6 processes keyboard events
2. How the vim plugin handles keymaps
3. How contenteditable input works
4. How our application-layer workaround attempts to coordinate all three

**Previous solutions failed because they made incorrect assumptions** about event flow and timing.

**The experimental approach is critical** because we need to:
1. **Validate our understanding** of the event pipeline
2. **Discover unknown unknowns** in vim/CodeMirror interaction
3. **Find the right interception point** backed by data
4. **Design a robust solution** based on reality, not assumptions

**This is a research problem, not just an implementation problem**. The experimental phase will provide the foundation for a sustainable, correct solution.

---

## Next Steps

1. **Review this analysis** with the development team
2. **Agree on experimental priorities** and timeline
3. **Setup experimental environment** (logger, data collection)
4. **Begin Experiment 1** (Event Flow Mapping)
5. **Share findings** and adjust approach based on discoveries

**Estimated Timeline**: 2-3 weeks to complete experimental phase and design robust solution

**Risk**: Medium - Experiments may reveal that no application-layer solution is viable, requiring vim plugin fork

**Reward**: High - Once understood, solution will be robust and maintainable for years to come
