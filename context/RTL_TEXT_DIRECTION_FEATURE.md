# RTL Text Direction Feature Documentation

## Overview

The RTL (Right-to-Left) text direction feature provides comprehensive support for RTL languages like Arabic, Hebrew, Urdu, Persian, and others in Zettlr's CodeMirror editor. This feature was implemented as **Phase 1: App-wide RTL support** following the established architectural patterns from the Vim keyboard layout feature.

## Features

### 🌐 **Three Direction Modes**

1. **LTR (Left-to-Right)**: Standard left-to-right text flow for Latin scripts
2. **RTL (Right-to-Left)**: Right-to-left text flow for Arabic, Hebrew, etc.
3. **Auto-detect (Default)**: Automatically detects document language and applies appropriate direction

### 🔍 **Auto-Detection Algorithm**

The auto-detection feature uses Unicode character analysis to determine text direction:

- **RTL Detection**: Covers Unicode ranges for Arabic (`\u0600-\u06FF`), Hebrew (`\u0590-\u05FF`), and other RTL scripts
- **Decision Logic**: Applies RTL if RTL characters exist and outnumber Latin characters
- **Real-time Updates**: Adjusts direction as you type different languages
- **Performance Optimized**: Only runs on content changes, not every keystroke

### 📱 **User Interface**

**Location**: Preferences → Editor → Writing direction

**Options**:
- Left-to-right (LTR)
- Right-to-left (RTL)
- Auto-detect from content *(Default)*

**Translations**: Full Arabic localization provided

## Technical Implementation

### 🏗️ **Architecture**

The implementation follows Zettlr's established configuration pipeline:

```
Config Schema → Editor Configuration → CodeMirror Extension → UI Preferences → Translations
```

### 📁 **Key Files Modified**

1. **`source/app/service-providers/config/get-config-template.ts`**
   - Added `textDirection: 'ltr'|'rtl'|'auto'` to ConfigOptions
   - Set default to `'auto'`

2. **`source/common/modules/markdown-editor/util/configuration.ts`**
   - Added textDirection to EditorConfiguration interface

3. **`source/common/modules/markdown-editor/plugins/text-direction.ts`** *(NEW)*
   - Main RTL implementation with auto-detection
   - CodeMirror 6 extension with CSS theming
   - Unicode-based language detection algorithm

4. **`source/common/modules/markdown-editor/editor-extension-sets.ts`**
   - Integrated textDirection extension into core extensions

5. **`source/win-main/MainEditor.vue`**
   - Added textDirection to editorConfiguration pipeline

6. **`source/win-preferences/schema/editor.ts`**
   - Replaced RTL placeholder with functional UI controls

7. **`static/lang/ar-AR.po`**
   - Added comprehensive Arabic translations

### 🎨 **CSS Implementation**

The extension uses CodeMirror 6's theme system for efficient styling:

```typescript
// CSS theming for RTL support
export function textDirectionTheme(): Extension {
  return EditorView.theme({
    '&': {
      unicodeBidi: 'plaintext', // Enables proper bidirectional text handling
    },
    '&[dir="rtl"]': {
      direction: 'rtl',
      textAlign: 'right'
    },
    // RTL-specific cursor styling
    '[dir="rtl"] .cm-cursor': {
      borderLeftWidth: '0px',
      borderRightWidth: '1px'
    }
  })
}
```

### ⚡ **Performance Optimization**

The update listener is optimized to only trigger when necessary:

```typescript
EditorView.updateListener.of((update) => {
  // Only update when config changes or document changes (for auto-detection)
  if (update.docChanged || update.startState.doc.length === 0 ||
      update.transactions.some(tr => tr.reconfigured)) {
    // Apply text direction...
  }
})
```

## Usage Examples

### 📝 **Auto-Detection Examples**

**Arabic Document:**
```
Input: "مرحبا بك في Zettlr - أفضل محرر للنصوص"
Result: RTL (Arabic characters dominate)
```

**English with Arabic:**
```
Input: "Welcome to مرحبا - this is mostly English"
Result: LTR (Latin characters dominate)
```

**Mixed Academic Text:**
```
Input: "The Arabic word مرحبا means 'welcome' in English"
Result: LTR (academic context, Latin majority)
```

### 🌍 **Supported Languages**

The RTL feature supports all languages in these Unicode blocks:

- **Arabic** (العربية): `\u0600-\u06FF`
- **Hebrew** (עברית): `\u0590-\u05FF`
- **Syriac** (ܠܫܢܐ ܣܘܪܝܝܐ): `\u0700-\u074F`
- **Thaana** (ދިވެހި): `\u0780-\u07BF`
- **NKo** (ߒߞߏ): `\u07C0-\u07FF`
- **Arabic Presentation Forms**: `\uFB50-\uFDFF`, `\uFE70-\uFEFF`

## Configuration

### ⚙️ **Default Settings**

```typescript
{
  editor: {
    textDirection: 'auto' // Default: Auto-detect from content
  }
}
```

### 🔧 **Programmatic Access**

The text direction can be accessed via the configuration system:

```typescript
// In editor extensions
const config = state.field(configField)
const direction = config.textDirection // 'ltr' | 'rtl' | 'auto'
```

## Testing

### ✅ **Manual Testing Checklist**

1. **UI Testing**:
   - [ ] Open Preferences → Editor → Writing direction
   - [ ] Verify three options are available (LTR/RTL/Auto)
   - [ ] Check Arabic translations when language is set to Arabic

2. **Functionality Testing**:
   - [ ] Set to LTR → Text flows left-to-right
   - [ ] Set to RTL → Text flows right-to-left
   - [ ] Set to Auto → Type Arabic text, verify RTL is applied
   - [ ] Set to Auto → Type English text, verify LTR is applied

3. **Auto-Detection Testing**:
   - [ ] Type: "مرحبا" → Should apply RTL
   - [ ] Type: "Hello مرحبا world" → Should apply LTR (Latin majority)
   - [ ] Clear and type: "مرحبا أيها العالم" → Should apply RTL

4. **Performance Testing**:
   - [ ] Verify direction updates in real-time as you type
   - [ ] Check console logs show direction changes
   - [ ] Ensure no excessive re-rendering

### 🐛 **Common Issues**

**Issue**: Text direction not changing
- **Cause**: Configuration not updating properly
- **Fix**: Check that `textDirection` is included in `editorConfiguration` computed property

**Issue**: Excessive console logs
- **Cause**: Update listener triggering too frequently
- **Fix**: Ensure update condition only triggers on content/config changes

## Future Enhancements (Phase 2)

### 📄 **Per-Document RTL Support**

Phase 2 could add document-level text direction by:

1. **Document Metadata**: Store direction in document frontmatter/metadata
2. **File-Specific UI**: Add toolbar controls for per-document direction
3. **Persistence**: Save document direction preference in document properties
4. **Mixed Documents**: Support different sections with different directions

### 🎯 **Advanced Features**

- **Language Detection Libraries**: Integrate more sophisticated language detection
- **Paragraph-Level Direction**: Support mixed LTR/RTL paragraphs in same document
- **Export Compatibility**: Ensure RTL formatting is preserved in PDF/HTML export
- **Vim Mode Integration**: RTL-aware cursor movement in Vim mode

## Architecture Decisions

### 🏛️ **Why App-Wide First?**

Phase 1 implements app-wide RTL support because:
- **Simpler Implementation**: Single configuration point, easier to test and debug
- **User Familiarity**: Most users prefer consistent direction across all documents
- **Foundation Building**: Establishes the technical infrastructure for Phase 2
- **Immediate Value**: Provides RTL support for the majority of use cases

### 🎨 **Why Auto-Detection?**

Auto-detection was chosen as the default because:
- **Zero Configuration**: Works out-of-the-box for multilingual users
- **Academic Use Cases**: Perfect for research papers mixing languages
- **Dynamic Adaptation**: Adjusts as document content changes
- **Accessibility**: Better experience for users switching between languages

### ⚡ **Performance Considerations**

- **Efficient Regex**: Unicode range matching is optimized for speed
- **Conditional Updates**: Only runs on actual content changes
- **CSS Theming**: Uses CodeMirror's efficient theme system
- **Minimal DOM**: Updates only necessary attributes (`dir`, text-align)

## Related Features

- **Vim Fixed Keyboard Layout**: RTL works seamlessly with Vim physical key mapping
- **Arabic Translations**: Complete UI localization supports RTL interface languages
- **Markdown Rendering**: RTL text direction preserves Markdown syntax highlighting

## Support

For technical questions or issues related to the RTL feature, refer to:
- **Implementation Details**: `/source/common/modules/markdown-editor/plugins/text-direction.ts`
- **Configuration Schema**: `/source/app/service-providers/config/get-config-template.ts`
- **UI Integration**: `/source/win-preferences/schema/editor.ts`