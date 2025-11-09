# Keyboard Training Feature for Vim Fixed Keyboard Layout

**Status**: ✅ Implemented - Ready for Testing
**Repository**: `../Zettlr-official` (Zettlr 3.6.0 + CodeMirror 6)
**Branch**: `v3.6.0-arabic`
**Created**: 2025-11-09
**Completed**: 2025-11-09

## Overview

This document describes the **Interactive Key Training UI** feature being developed to solve the modifier key mapping problem for Vim fixed keyboard layout support across different Latin keyboard layouts (German QWERTZ, French AZERTY, etc.).

## The Problem

The Keyboard Layout Map API (`navigator.keyboard.getLayoutMap()`) has a fundamental limitation: it only captures **unmodified** keys and cannot detect **modifier combinations**.

**Example on German QWERTZ keyboard:**
- ✅ Can capture: `BracketLeft` → `ü`, `Digit8` → `8`
- ❌ **Cannot** capture: `Alt+Digit8` → `{`, `Alt+Digit9` → `}`

This means essential Vim commands like paragraph jumping (`{`, `}`) and other bracket commands don't work because they require Alt/Option modifiers on European keyboards.

## The Solution: Interactive Key Training UI

Instead of trying to automatically detect modifier key mappings, we provide a **user-friendly training interface** where users manually configure which physical keys produce Vim command characters on their preferred Latin keyboard.

### Design Inspiration

The UI will be similar to:
1. **Zettlr's Autocorrect Settings** - Shows a list of character replacements (e.g., `->` → `→`)
2. **VSCode Shortcut Configuration** - Click a field and press the key combo to capture it
3. **macOS Keyboard Shortcuts** - System Preferences keyboard shortcut capture

### User Workflow

1. User enables "Vim Fixed Keyboard Layout" in Editor settings
2. User sees a **pre-populated list** of Vim command characters that typically require modifiers:
   ```
   Character    Key Combination
   {            [Click to set]
   }            [Click to set]
   [            [Click to set]
   ]            [Click to set]
   (            [Click to set]
   )            [Click to set]
   @            [Click to set]
   #            [Click to set]
   $            [Click to set]
   %            [Click to set]
   ^            [Click to set]
   &            [Click to set]
   *            [Click to set]
   ```

3. User switches to their **preferred Latin keyboard** (e.g., German QWERTZ)
4. User clicks on the "Key Combination" field for `{`
5. User presses `Alt+8` (on German keyboard)
6. System captures: `{ code: 'Digit8', altKey: true }` and displays "Alt+8"
7. Repeat for all needed characters
8. Configuration is saved

9. When user switches to Arabic keyboard and enters Vim Normal mode:
   - Physical key `Digit8` with `Alt` pressed → Vim receives `{` command
   - Paragraph jumping works perfectly!

## Implementation Location

**All implementation happens in**: `../Zettlr-official/` (Zettlr 3.6.0 repository)

### Files to Modify

#### 1. Configuration Storage
**File**: `../Zettlr-official/source/common/modules/markdown-editor/util/configuration.ts`

Add new configuration field:
```typescript
export interface EditorConfiguration {
  // ... existing fields ...
  inputMode: 'default'|'vim'|'emacs'
  vimFixedKeyboardLayout: boolean
  vimKeyMappings: Record<string, KeyMapping>  // NEW FIELD
  // ... other fields ...
}

// NEW INTERFACE
export interface KeyMapping {
  code: string          // Physical key code (e.g., 'Digit8')
  shiftKey: boolean     // Whether Shift is required
  altKey: boolean       // Whether Alt/Option is required
  ctrlKey: boolean      // Whether Ctrl is required
  metaKey: boolean      // Whether Meta/Cmd is required
}

export function getDefaultConfig(): EditorConfiguration {
  return {
    // ... existing defaults ...
    vimFixedKeyboardLayout: false,
    vimKeyMappings: getDefaultVimKeyMappings(),  // Pre-populated
    // ... other defaults ...
  }
}

function getDefaultVimKeyMappings(): Record<string, KeyMapping> {
  return {
    // Empty by default - user trains their keyboard
    // Or optionally pre-populate with US QWERTY defaults:
    '{': { code: 'BracketLeft', shiftKey: true, altKey: false, ctrlKey: false, metaKey: false },
    '}': { code: 'BracketRight', shiftKey: true, altKey: false, ctrlKey: false, metaKey: false },
    // ... etc.
  }
}
```

#### 2. Preferences UI - Training Interface
**File**: `../Zettlr-official/source/win-preferences/schema/editor.ts`

Add new section to editor preferences:
```typescript
{
  type: 'group',
  title: 'Vim Key Mappings',
  if: { inputMode: 'vim', vimFixedKeyboardLayout: true },
  fields: [
    {
      type: 'info',
      content: 'Configure which keys on your Latin keyboard produce Vim commands. Switch to your preferred Latin keyboard layout (e.g., German QWERTZ) before training.'
    },
    {
      type: 'custom',
      component: 'VimKeyMappingTrainer'  // NEW COMPONENT
    }
  ]
}
```

#### 3. Vue Component - Key Mapping Trainer
**File** (NEW): `../Zettlr-official/source/win-preferences/KeyMappingTrainer.vue`

```vue
<template>
  <div class="vim-key-mapping-trainer">
    <p class="instructions">
      Click on a key combination field and press the desired key combo on your
      keyboard. Leave empty if the character is not accessible or already works.
    </p>

    <table class="key-mappings-table">
      <thead>
        <tr>
          <th>Vim Character</th>
          <th>Description</th>
          <th>Key Combination</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="char in vimCharacters" :key="char.char">
          <td class="char-display">{{ char.char }}</td>
          <td class="description">{{ char.description }}</td>
          <td>
            <KeyCaptureInput
              :character="char.char"
              :mapping="mappings[char.char]"
              @update="updateMapping(char.char, $event)"
            />
          </td>
          <td>
            <button
              v-if="mappings[char.char]"
              @click="clearMapping(char.char)"
              class="clear-btn"
            >
              Clear
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import KeyCaptureInput from './KeyCaptureInput.vue'

const vimCharacters = [
  { char: '{', description: 'Jump to previous paragraph' },
  { char: '}', description: 'Jump to next paragraph' },
  { char: '[', description: 'Various bracket commands' },
  { char: ']', description: 'Various bracket commands' },
  { char: '(', description: 'Jump to previous sentence' },
  { char: ')', description: 'Jump to next sentence' },
  { char: '@', description: 'Play macro' },
  { char: '#', description: 'Search word backward' },
  { char: '$', description: 'End of line' },
  { char: '%', description: 'Jump to matching bracket' },
  { char: '^', description: 'First non-blank character' },
  { char: '&', description: 'Repeat last substitute' },
  { char: '*', description: 'Search word forward' },
]

const mappings = ref<Record<string, KeyMapping>>({})

function updateMapping(char: string, mapping: KeyMapping) {
  mappings.value[char] = mapping
  // Save to configuration
}

function clearMapping(char: string) {
  delete mappings.value[char]
  // Save to configuration
}
</script>
```

#### 4. Key Capture Input Component
**File** (NEW): `../Zettlr-official/source/win-preferences/KeyCaptureInput.vue`

```vue
<template>
  <div
    class="key-capture-input"
    :class="{ capturing: isCapturing }"
    tabindex="0"
    @click="startCapture"
    @keydown="captureKey"
    @blur="stopCapture"
  >
    <span v-if="!mapping && !isCapturing" class="placeholder">
      Click to set
    </span>
    <span v-else-if="isCapturing" class="capturing-text">
      Press any key...
    </span>
    <span v-else class="key-display">
      {{ formatKeyCombo(mapping) }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { KeyMapping } from '../common/modules/markdown-editor/util/configuration'

const props = defineProps<{
  character: string
  mapping: KeyMapping | undefined
}>()

const emit = defineEmits<{
  update: [mapping: KeyMapping]
}>()

const isCapturing = ref(false)

function startCapture() {
  isCapturing.value = true
}

function stopCapture() {
  isCapturing.value = false
}

function captureKey(event: KeyboardEvent) {
  if (!isCapturing.value) return

  // Ignore modifier-only keys
  if (['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) {
    return
  }

  event.preventDefault()
  event.stopPropagation()

  const mapping: KeyMapping = {
    code: event.code,
    shiftKey: event.shiftKey,
    altKey: event.altKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey
  }

  // Verify that this key combo actually produces the target character
  if (event.key === props.character) {
    emit('update', mapping)
    stopCapture()
  } else {
    // Show error - this key combo doesn't produce the expected character
    console.warn(`Expected '${props.character}' but got '${event.key}'`)
  }
}

function formatKeyCombo(mapping: KeyMapping | undefined): string {
  if (!mapping) return ''

  const parts: string[] = []
  if (mapping.ctrlKey) parts.push('Ctrl')
  if (mapping.altKey) parts.push('Alt')
  if (mapping.shiftKey) parts.push('Shift')
  if (mapping.metaKey) parts.push('Cmd')

  // Convert code to friendly name (Digit8 → 8, KeyA → A, etc.)
  const keyName = mapping.code.replace(/^Key/, '').replace(/^Digit/, '')
  parts.push(keyName)

  return parts.join('+')
}
</script>

<style scoped>
.key-capture-input {
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  min-width: 120px;
  text-align: center;
  background: #f9f9f9;
}

.key-capture-input.capturing {
  border-color: #007acc;
  background: #e3f2fd;
  animation: pulse 1s infinite;
}

.placeholder {
  color: #999;
  font-style: italic;
}

.capturing-text {
  color: #007acc;
  font-weight: bold;
}

.key-display {
  font-family: 'Courier New', monospace;
  font-weight: 500;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(0, 122, 204, 0.4); }
  50% { box-shadow: 0 0 0 4px rgba(0, 122, 204, 0.1); }
}
</style>
```

#### 5. Apply Mappings in Vim Hook
**File**: `../Zettlr-official/source/common/modules/markdown-editor/hooks/vim-fixed-keyboard.ts`

Modify to use trained mappings:
```typescript
private handleKeydown (event: KeyboardEvent): void {
  // ... existing mode checks ...

  // Get configuration
  const config = this.view.state.field(configField)
  const customMappings = config.vimKeyMappings

  // First, check if this exact key combo matches a trained mapping
  const trainedCommand = this.findTrainedMapping(event, customMappings)
  if (trainedCommand !== null) {
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()

    this.processingKey = true
    try {
      if (cm) {
        vimAPI.handleKey(cm, trainedCommand, 'user')
      }
    } finally {
      this.processingKey = false
    }
    return
  }

  // Fallback to physical key mapping (for alphabetic keys)
  const vimCommand = getVimCommandForPhysicalKey(event.code, event.shiftKey)
  // ... rest of existing logic ...
}

private findTrainedMapping(
  event: KeyboardEvent,
  mappings: Record<string, KeyMapping>
): string | null {
  // Search through all trained mappings to find a match
  for (const [char, mapping] of Object.entries(mappings)) {
    if (
      mapping.code === event.code &&
      mapping.shiftKey === event.shiftKey &&
      mapping.altKey === event.altKey &&
      mapping.ctrlKey === event.ctrlKey &&
      mapping.metaKey === event.metaKey
    ) {
      return char  // Return the Vim command character
    }
  }
  return null
}
```

## Default Vim Characters to Pre-populate

The training UI will show these characters by default:

| Character | Vim Command | Description |
|-----------|-------------|-------------|
| `{` | Jump paragraph backward | Essential for navigation |
| `}` | Jump paragraph forward | Essential for navigation |
| `[` | Various commands | Bracket commands |
| `]` | Various commands | Bracket commands |
| `(` | Jump sentence backward | Sentence navigation |
| `)` | Jump sentence forward | Sentence navigation |
| `@` | Play macro | Macro playback |
| `#` | Search word backward | Search |
| `$` | End of line | Line navigation |
| `%` | Jump to matching bracket | Bracket jumping |
| `^` | First non-blank | Line navigation |
| `&` | Repeat substitute | Editing |
| `*` | Search word forward | Search |

**Note**: Characters like `h`, `j`, `k`, `l`, `w`, `b`, `e`, etc. already work via physical key mapping and don't need training.

## Configuration Storage Example

When user trains their German QWERTZ keyboard, the config will store:

```json
{
  "editor": {
    "inputMode": "vim",
    "vimFixedKeyboardLayout": true,
    "vimKeyMappings": {
      "{": { "code": "Digit7", "shiftKey": false, "altKey": true, "ctrlKey": false, "metaKey": false },
      "}": { "code": "Digit0", "shiftKey": false, "altKey": true, "ctrlKey": false, "metaKey": false },
      "[": { "code": "Digit5", "shiftKey": false, "altKey": true, "ctrlKey": false, "metaKey": false },
      "]": { "code": "Digit6", "shiftKey": false, "altKey": true, "ctrlKey": false, "metaKey": false },
      "(": { "code": "Digit8", "shiftKey": false, "altKey": false, "ctrlKey": false, "metaKey": false },
      ")": { "code": "Digit9", "shiftKey": false, "altKey": false, "ctrlKey": false, "metaKey": false },
      "@": { "code": "KeyQ", "shiftKey": false, "altKey": true, "ctrlKey": false, "metaKey": false },
      "$": { "code": "Digit4", "shiftKey": true, "altKey": false, "ctrlKey": false, "metaKey": false },
      "%": { "code": "Digit5", "shiftKey": true, "altKey": false, "ctrlKey": false, "metaKey": false },
      "^": { "code": "Digit6", "shiftKey": true, "altKey": false, "ctrlKey": false, "metaKey": false },
      "&": { "code": "Digit7", "shiftKey": true, "altKey": false, "ctrlKey": false, "metaKey": false },
      "*": { "code": "Digit8", "shiftKey": true, "altKey": false, "ctrlKey": false, "metaKey": false }
    }
  }
}
```

## How It Works at Runtime

1. User is typing in Arabic keyboard in Vim Normal mode
2. User presses physical key `Digit7` + `Alt`
3. Vim hook intercepts the keydown event
4. Checks `event.code === 'Digit7'` and `event.altKey === true`
5. Finds matching entry in `vimKeyMappings`: `{`
6. Sends `{` to Vim as the command
7. Vim executes paragraph jump backward ✅

## Advantages of This Approach

1. ✅ **Works with ANY keyboard layout** - User defines their own mappings
2. ✅ **No API limitations** - Direct event capture, no browser API dependency
3. ✅ **Cross-platform** - Works on Windows, macOS, Linux
4. ✅ **User-friendly** - Clear, intuitive UI similar to familiar settings
5. ✅ **Flexible** - Users can train only the keys they need
6. ✅ **Verifiable** - System checks that key combo produces expected character
7. ✅ **Persistent** - Saved in configuration, no need to recapture

## Implementation Phases

### Phase 1: Configuration Storage ✅ COMPLETED
- ✅ Added `KeyMapping` interface to `configuration.ts`
- ✅ Added `vimKeyMappings` field to `EditorConfiguration`
- ✅ Implemented `getDefaultVimKeyMappings()` with 13 pre-populated characters
- **Files Modified**:
  - `../Zettlr-official/source/common/modules/markdown-editor/util/configuration.ts`

### Phase 2: Vim Hook Updates ✅ COMPLETED
- ✅ Implemented `findTrainedMapping()` method in vim-fixed-keyboard.ts
- ✅ Updated `handleKeydown()` to prioritize trained mappings over physical mappings
- ✅ Trained mappings support all modifier keys (Alt, Ctrl, Meta, Shift)
- ✅ Physical key mappings restricted to unmodified or Shift-only keys
- **Files Modified**:
  - `../Zettlr-official/source/common/modules/markdown-editor/hooks/vim-fixed-keyboard.ts`

### Phase 3: Form Builder Integration ✅ COMPLETED
- ✅ Added `VimKeyMappingTrainerField` interface to FormBuilder
- ✅ Added to `FormField` union type
- ✅ Added template handling and import in FormField.vue
- **Files Modified**:
  - `../Zettlr-official/source/common/vue/form/FormBuilder.vue`
  - `../Zettlr-official/source/common/vue/form/FormField.vue`

### Phase 4: Preferences UI ✅ COMPLETED
- ✅ Added separator, sub-heading, and info text to editor schema
- ✅ Added `vim-key-mapping-trainer` field type to schema
- **Files Modified**:
  - `../Zettlr-official/source/win-preferences/schema/editor.ts`

### Phase 5: Vue Component ✅ COMPLETED
- ✅ Created `VimKeyMappingTrainer.vue` with interactive table UI
- ✅ Implemented click-to-capture interface (like VSCode shortcuts)
- ✅ Added visual feedback with modifier key badges
- ✅ Added clear button for removing mappings
- ✅ Escape key cancels capture
- ✅ Professional styling with animations and hover effects
- **Files Created**:
  - `../Zettlr-official/source/common/vue/form/elements/VimKeyMappingTrainer.vue`

### Phase 6: Testing & Refinement 🚧 NEXT
- ⏳ Test with German QWERTZ keyboard
- ⏳ Test with Arabic keyboard switching
- ⏳ Verify all trained mappings work in Vim Normal mode
- ⏳ Test edge cases and error handling
- ⏳ Gather user feedback

## Testing Plan

**Test Case 1: German QWERTZ Keyboard**
1. Enable Vim mode + Fixed keyboard layout
2. Switch OS keyboard to German QWERTZ
3. Train `{` key → Press Alt+7 → Verify captures `Digit7+Alt`
4. Train `}` key → Press Alt+0 → Verify captures `Digit0+Alt`
5. Switch OS keyboard to Arabic
6. Enter Vim Normal mode
7. Press Alt+7 → Verify Vim executes `{` (paragraph jump)
8. Press Alt+0 → Verify Vim executes `}` (paragraph jump)

**Test Case 2: Empty Mappings**
1. Don't train any keys
2. Use Vim commands → Only alphabetic commands work (h, j, k, l, w, etc.)
3. Bracket commands don't work (expected behavior)

**Test Case 3: Partial Training**
1. Only train `{` and `}` keys
2. Verify these work in Normal mode
3. Verify other untrained special characters don't work (expected)

## Future Enhancements

1. **Import/Export Mappings** - Share keyboard configs
2. **Common Layout Presets** - Provide QWERTZ, AZERTY, etc. presets
3. **Validation** - Detect conflicting mappings
4. **Visual Feedback** - Show which Vim commands are currently available
5. **Reset to Defaults** - One-click reset to US QWERTY defaults

## References

- **Initial Feature Specification**: `CLAUDE.md` (APPENDIX section)
- **Architect Analysis**: Software architect's comprehensive review (commit history)
- **Keyboard Layout Map API Limitation**: WICG GitHub Issue #26
- **Obsidian's Approach**: `.obsidian.vimrc` manual configuration

---

## Actual Implementation Details

### Files Modified/Created

#### 1. Configuration (`configuration.ts`) - Lines 31-81, 141
```typescript
// Added KeyMapping interface (lines 31-47)
export interface KeyMapping {
  vimChar: string
  code: string
  shiftKey: boolean
  altKey: boolean
  ctrlKey: boolean
  metaKey: boolean
}

// Added to EditorConfiguration interface (line 81)
vimKeyMappings: Record<string, KeyMapping>

// Added default config (line 141)
vimKeyMappings: getDefaultVimKeyMappings()

// Added function (lines 156-179)
export function getDefaultVimKeyMappings(): Record<string, KeyMapping> {
  // Pre-populates 13 Vim characters with empty mappings
  const vimChars = ['{', '}', '[', ']', '(', ')', '@', '#', '$', '%', '^', '&', '*']
  // Returns empty mappings for user to train
}
```

#### 2. Vim Hook (`vim-fixed-keyboard.ts`) - Lines 106-201
```typescript
// Updated handleKeydown to check trained mappings first (lines 106-131)
const trainedCommand = this.findTrainedMapping(event)
if (trainedCommand !== null) {
  // Process trained mapping with all modifiers
}

// Then fallback to physical key mapping (lines 133-161)
// Only for unmodified or Shift-only keys

// New method findTrainedMapping (lines 164-201)
private findTrainedMapping (event: KeyboardEvent): string | null {
  const config = this.view.state.field(configField)
  const mappings = config.vimKeyMappings
  // Searches for exact match: code + all modifiers
}
```

#### 3. Form Builder (`FormBuilder.vue`) - Lines 229-231, 238
```typescript
// Added interface (lines 229-231)
interface VimKeyMappingTrainerField extends BasicInfo {
  type: 'vim-key-mapping-trainer'
}

// Added to FormField union type (line 238)
export type FormField = ... | VimKeyMappingTrainerField
```

#### 4. Form Field (`FormField.vue`) - Lines 153-158, 177
```vue
<!-- Added template block (lines 153-158) -->
<VimKeyMappingTrainer
  v-else-if="props.field.type === 'vim-key-mapping-trainer'"
  v-bind:model-value="model"
  v-bind:name="props.field.model"
  v-on:update:model-value="emit('update:modelValue', $event)"
></VimKeyMappingTrainer>

<!-- Added import (line 177) -->
import VimKeyMappingTrainer from './elements/VimKeyMappingTrainer.vue'
```

#### 5. Preferences Schema (`editor.ts`) - Lines 51-65
```typescript
// Added separator, heading, info, and field (lines 51-65)
{ type: 'separator' },
{
  type: 'form-text',
  display: 'sub-heading',
  contents: trans('Custom Vim Key Mappings')
},
{
  type: 'form-text',
  display: 'info',
  contents: trans('Train custom key combinations...')
},
{
  type: 'vim-key-mapping-trainer',
  model: 'editor.vimKeyMappings'
}
```

#### 6. Vue Component (`VimKeyMappingTrainer.vue`) - NEW FILE (371 lines)
**Features**:
- Interactive table with 3 columns: Vim Character, Key Combination, Actions
- Click-to-capture interface - clicks activate keydown listener
- Visual feedback during capture (blue border, pulsing animation)
- Displays modifier badges (⌘, Ctrl, Alt, Shift) + physical key
- Clear button (×) to remove mappings
- Escape key cancels capture
- Proper event handling with capture phase
- Clean up of event listeners on component destroy

**Key Methods**:
- `startCapture(vimChar)` - Begins listening for key combo
- `handleCaptureKeydown(event)` - Captures the key combo
- `cancelCapture()` - Stops listening and cleans up
- `clearMapping(vimChar)` - Removes a trained mapping
- `formatKeyCode(code)` - Converts codes like 'Digit8' to '8'

**Styling**:
- Responsive table layout
- Hover effects on rows and capture fields
- Visual states: empty (dashed border), capturing (blue + pulse), filled (solid)
- Monospace font for code/keys
- Professional color scheme matching Zettlr

### How to Use (Testing Guide)

1. **Launch Zettlr**: `cd ../Zettlr-official && yarn start`

2. **Navigate to Preferences**:
   - Open Preferences (Cmd+, or File → Preferences)
   - Go to "Editor" tab
   - Scroll to "Input mode" section

3. **Enable Vim Fixed Keyboard**:
   - Change Input mode to "Vim"
   - Check "Use fixed keyboard layout for Vim Normal mode"
   - Scroll down to see "Custom Vim Key Mappings" section

4. **Train Keys** (with German QWERTZ keyboard):
   - Switch OS keyboard to German QWERTZ
   - Click the "Key Combination" cell for `{`
   - Press `Alt+8` (should capture "Alt+8")
   - Click the "Key Combination" cell for `}`
   - Press `Alt+9` (should capture "Alt+9")
   - Repeat for other characters as needed

5. **Test in Editor**:
   - Create a new document
   - Switch OS keyboard to Arabic
   - Type some text with multiple paragraphs
   - Press `Esc` to enter Vim Normal mode
   - Press `Alt+8` → Should jump to previous paragraph (`{` command)
   - Press `Alt+9` → Should jump to next paragraph (`}` command)

### Known Limitations

1. **Character Verification**: The current implementation doesn't verify that the pressed key combo actually produces the target character (removed the validation from KeyCaptureInput example)

2. **No Conflict Detection**: Users could potentially map the same key combo to multiple characters

3. **No Presets**: No built-in presets for common layouts (German QWERTZ, French AZERTY)

4. **Configuration Persistence**: Relies on Zettlr's configuration system - needs testing to ensure mappings persist across restarts

---

**Document Version**: 2.0
**Last Updated**: 2025-11-09 (Implementation Completed)
**Implementation Repository**: `../Zettlr-official`
**Branch**: `v3.6.0-arabic`
