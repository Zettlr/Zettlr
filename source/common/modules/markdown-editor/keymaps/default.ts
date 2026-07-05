/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Default Keymap
 * CVM-Role:        CodeMirror Extension
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This is the default Zettlr keymap that is valid for every
 *                  CodeMirror editor. It combines a series of factory keymaps
 *                  that ship with CodeMirror in addition to custom commands
 *                  that Zettlr defines.
 *
 * END HEADER
 */

import {
  acceptCompletion, closeCompletion, moveCompletionSelection,
  startCompletion, deleteBracketPair
} from '@codemirror/autocomplete'
import {
  cursorCharLeft, selectCharLeft, cursorGroupLeft, selectGroupLeft,
  cursorLineBoundaryLeft, selectLineBoundaryLeft, cursorCharRight,
  selectCharRight, cursorGroupRight, selectGroupRight, cursorLineBoundaryRight,
  selectLineBoundaryRight, cursorLineUp, selectLineUp, cursorDocStart,
  selectDocStart, cursorPageUp, selectPageUp, cursorLineDown, selectLineDown,
  cursorDocEnd, selectDocEnd, cursorPageDown, selectPageDown,
  cursorLineBoundaryBackward, selectLineBoundaryBackward,
  cursorLineBoundaryForward, selectLineBoundaryForward, insertNewlineAndIndent,
  deleteCharBackward, deleteCharForward, deleteGroupBackward,
  deleteGroupForward, deleteLineBoundaryBackward, deleteLineBoundaryForward,
  cursorLineEnd, cursorLineStart, deleteToLineEnd, selectLineEnd,
  selectLineStart, splitLine, transposeChars, copyLineDown, copyLineUp,
  cursorMatchingBracket, cursorSyntaxLeft, cursorSyntaxRight, deleteLine,
  indentLess, indentMore, indentSelection, insertBlankLine, moveLineDown,
  moveLineUp, selectAll, selectLine, selectParentSyntax, selectSyntaxLeft,
  selectSyntaxRight, simplifySelection, toggleBlockComment, toggleComment,
  toggleTabFocusMode, redo, redoSelection, undo, undoSelection
} from '@codemirror/commands'
import { foldAll, foldCode, unfoldAll, unfoldCode } from '@codemirror/language'
import {
  openSearchPanel, findNext, findPrevious, closeSearchPanel,
  selectSelectionMatches, gotoLine, selectNextOccurrence
} from '@codemirror/search'
import { type KeyBinding } from '@codemirror/view'
import {
  insertNewlineContinueMarkup, deleteMarkupBackward
} from '@codemirror/lang-markdown'

import { nextSnippet, abortSnippet, abortSnippetRemoveContent } from '../autocomplete/snippets'
import {
  handleBackspace,
  handleQuote,
  handleAutocorrectEnter,
  handleAutocorrectSpace
} from '../commands/autocorrect'
import { addNewFootnote, selectFootnoteBeforeDelete } from '../commands/footnotes'
import {
  maybeIndentList, maybeUnindentList, customMoveLineUp, customMoveLineDown
} from '../commands/lists'
import {
  insertLink, insertImage, applyBold, applyItalic, applyComment, applyTaskList,
  applyHighlight,
  insertTabOrSpace
} from '../commands/markdown'
import { pasteAsPlain, copyAsHTML } from '../util/copy-paste-cut'
import { addColAfter, addColBefore, moveNextCell, movePrevCell, swapNextCol, swapPrevCol } from '../table-editor/commands/columns'
import { alignTables, setAlignment } from '../table-editor/commands/tables'
import { addRowAfter, addRowBefore, moveNextRow, movePrevRow, swapNextRow, swapPrevRow } from '../table-editor/commands/rows'
import { removeLineBreaks } from '../commands/transforms/remove-line-breaks'
import {
  type EditorShortcutName, getCustomShortcut, type CustomEditorShortcut
} from './shortcuts'
import { zapGremlins } from '../commands/transforms/zap-gremlins'
import { stripDuplicateSpaces } from '../commands/transforms/strip-duplicate-spaces'
import { italicsToQuotes } from '../commands/transforms/italics-to-quotes'
import { quotesToItalics } from '../commands/transforms/quotes-to-italics'
import { configField } from '../util/configuration'
import { straightenQuotes } from '../commands/transforms/straighten-quotes'
import { curlQuotes } from '../commands/transforms/curl-quotes'
import { toDoubleQuotes } from '../commands/transforms/to-double-quotes'
import { doubleQuotesToSingle } from '../commands/transforms/double-quotes-to-single-quotes'
import { singleQuotesToDouble } from '../commands/transforms/single-quotes-to-double-quotes'
import { addSpacesAroundEmdashes } from '../commands/transforms/add-spaces-around-emdashes'
import { removeSpacesAroundEmdashes } from '../commands/transforms/remove-spaces-around-emdashes'
import { toSentenceCase } from '../commands/transforms/to-sentence-case'
import { toTitleCase } from '../commands/transforms/to-title-case'

/**
 * Returns the main editor keybindings, taking into account any custom editor
 * shortcuts the user may have set. This keymap is a mixture of many of the
 * keymaps Codemirror ships with, plus some others that we personally need.
 *
 * @return  {Keybinding[]}  The keybindings. Must be passed to `keymap.of()`
 */
export function mainEditorKeybindings (customShortcutMap: CustomEditorShortcut[]): KeyBinding[] {
  // Utility function to make retrieval much easier
  const sc = (name: EditorShortcutName) => {
    return getCustomShortcut(name, customShortcutMap)
  }

  const alignLeft = setAlignment('left')
  const alignCenter = setAlignment('center')
  const alignRight = setAlignment('right')
  return [
    // NOTE: This keymap is SORTED by two factors:
    // 1. The key name
    // 2. Specificity/context.
    // Since previous shortcuts override later ones, the more specific they are
    // the further atop they need to be.

    // Tabulator
    { key: 'Tab', run: acceptCompletion },
    { key: 'Tab', run: nextSnippet },
    { key: 'Tab', run: moveNextCell },
    { key: 'Tab', run: maybeIndentList },
    { key: 'Tab', run: insertTabOrSpace },
    { key: 'Tab', run: indentMore },
    { key: 'Shift-Tab', run: movePrevCell },
    { key: 'Shift-Tab', run: maybeUnindentList },
    { key: 'Shift-Tab', run: indentLess },
    
    // Enter
    { key: 'Enter', run: handleAutocorrectEnter },
    { key: 'Enter', run: moveNextRow },
    { key: 'Enter', run: insertNewlineContinueMarkup },
    { key: 'Enter', run: insertNewlineAndIndent },
    { key: 'Mod-Enter', run: insertBlankLine },
    { key: 'Shift-Enter', run: movePrevRow },
    { key: 'Shift-Enter', run: insertNewlineAndIndent },

    // Backspace
    { key: 'Backspace', run: selectFootnoteBeforeDelete },
    { key: 'Backspace', run: handleBackspace },
    { key: 'Backspace', run: deleteMarkupBackward },
    { key: 'Backspace', run: deleteBracketPair },
    { key: 'Backspace', run: deleteCharBackward },
    { key: 'Shift-Backspace', run: deleteCharBackward },
    { key: 'Mod-Backspace', mac: 'Alt-Backspace', run: deleteGroupBackward },
    { mac: 'Mod-Backspace', run: deleteLineBoundaryBackward },
    
    // Delete
    { key: 'Delete', run: deleteCharForward },
    { key: 'Mod-Delete', mac: 'Alt-Delete', run: deleteGroupForward },
    { mac: 'Mod-Delete', run: deleteLineBoundaryForward },

    // Escape
    { key: 'Escape', run: abortSnippet },
    { key: 'Escape', run: closeCompletion },
    { key: 'Escape', run: closeSearchPanel },
    { key: 'Escape', run: simplifySelection },
    { key: 'Shift-Escape', run: abortSnippetRemoveContent },
    
    // Arrow Up
    { key: 'ArrowUp', run: moveCompletionSelection(false) },
    { key: 'ArrowUp', run: cursorLineUp, preventDefault: true },
    { key: 'Alt-ArrowUp', run: swapPrevRow },
    { key: 'Alt-ArrowUp', run: customMoveLineUp },
    { key: 'Alt-ArrowUp', run: moveLineUp },
    { key: 'Alt-Shift-ArrowUp', run: addRowBefore },
    { key: 'Alt-Shift-ArrowUp', run: copyLineUp },
    { key: 'Shift-ArrowUp', run: selectLineUp, preventDefault: true },
    // Mac-only
    { mac: 'Cmd-ArrowUp', run: cursorDocStart },
    { mac: 'Cmd-Shift-ArrowUp', run: selectDocStart },
    { mac: 'Ctrl-ArrowUp', run: cursorPageUp },
    { mac: 'Ctrl-Shift-ArrowUp', run: selectPageUp },

    // Arrow Right
    { key: 'ArrowRight', run: cursorCharRight, preventDefault: true },
    { key: 'Alt-ArrowRight', run: swapNextCol },
    { key: 'Alt-ArrowRight', mac: 'Ctrl-ArrowRight', run: cursorSyntaxRight },
    { key: 'Alt-Shift-ArrowRight', run: addColAfter },
    { key: 'Alt-Shift-ArrowRight', mac: 'Ctrl-Shift-ArrowRight', run: selectSyntaxRight },
    { key: 'Shift-ArrowRight', run: selectCharRight, preventDefault: true },
    { key: 'Mod-ArrowRight', mac: 'Alt-ArrowRight', run: cursorGroupRight, preventDefault: true },
    { key: 'Mod-Shift-ArrowRight', mac: 'Alt-Shift-ArrowRight', run: selectGroupRight, preventDefault: true },
    // Mac-only
    { mac: 'Cmd-ArrowRight', run: cursorLineBoundaryRight, preventDefault: true },
    { mac: 'Cmd-Shift-ArrowRight', run: selectLineBoundaryRight, preventDefault: true },

    // Arrow Down
    { key: 'ArrowDown', run: moveCompletionSelection(true) },
    { key: 'ArrowDown', run: cursorLineDown, preventDefault: true },
    { key: 'Alt-ArrowDown', run: swapNextRow },
    { key: 'Alt-ArrowDown', run: customMoveLineDown },
    { key: 'Alt-ArrowDown', run: moveLineDown },
    { key: 'Shift-ArrowDown', run: selectLineDown, preventDefault: true },
    { key: 'Alt-Shift-ArrowDown', run: addRowAfter },
    { key: 'Alt-Shift-ArrowDown', run: copyLineDown },
    // Mac-only
    { mac: 'Cmd-ArrowDown', run: cursorDocEnd },
    { mac: 'Cmd-Shift-ArrowDown', run: selectDocEnd },
    { mac: 'Ctrl-ArrowDown', run: cursorPageDown },
    { mac: 'Ctrl-Shift-ArrowDown', run: selectPageDown },

    // Arrow Left
    { key: 'ArrowLeft', run: cursorCharLeft, preventDefault: true },
    { key: 'Alt-ArrowLeft', run: swapPrevCol },
    { key: 'Alt-ArrowLeft', mac: 'Ctrl-ArrowLeft', run: cursorSyntaxLeft },
    { key: 'Shift-ArrowLeft', run: selectCharLeft, preventDefault: true },
    { key: 'Alt-Shift-ArrowLeft', run: addColBefore },
    { key: 'Alt-Shift-ArrowLeft', mac: 'Ctrl-Shift-ArrowLeft', run: selectSyntaxLeft },
    { key: 'Mod-ArrowLeft', mac: 'Alt-ArrowLeft', run: cursorGroupLeft, preventDefault: true },
    { key: 'Mod-Shift-ArrowLeft', mac: 'Alt-Shift-ArrowLeft', run: selectGroupLeft, preventDefault: true },
    // Mac-only
    { mac: 'Cmd-ArrowLeft', run: cursorLineBoundaryLeft, preventDefault: true },
    { mac: 'Cmd-Shift-ArrowLeft', run: selectLineBoundaryLeft, preventDefault: true },

    // Home
    { key: 'Home', run: cursorLineBoundaryBackward, preventDefault: true },
    { key: 'Mod-Home', run: cursorDocStart },
    { key: 'Shift-Home', run: selectLineBoundaryBackward, preventDefault: true },
    { key: 'Mod-Shift-Home', run: selectDocStart },
    
    // End
    { key: 'End', run: cursorLineBoundaryForward, preventDefault: true },
    { key: 'Mod-End', run: cursorDocEnd },
    { key: 'Shift-End', run: selectLineBoundaryForward, preventDefault: true },
    { key: 'Mod-Shift-End', run: selectDocEnd },
    
    // Page down
    { key: 'PageDown', run: moveCompletionSelection(true, 'page') },
    { key: 'PageDown', run: cursorPageDown },
    { key: 'Shift-PageDown', run: selectPageDown },
    
    // Page up
    { key: 'PageUp', run: moveCompletionSelection(false, 'page') },
    { key: 'PageUp', run: cursorPageUp },
    { key: 'Shift-PageUp', run: selectPageUp },
    
    // Some keybindings that should work even in case of conflicts
    { key: 'Space', run: handleAutocorrectSpace },
    { key: 'Mod-Shift-v', run: view => { pasteAsPlain(view); return true } },
    { key: 'Mod-Alt-c', run: view => { copyAsHTML(view); return true } },
    { key: '"', run: handleQuote('"') },
    { key: "'", run: handleQuote("'") },

    { key: 'Mod-a', run: selectAll },

    // Transformations keymap
    { key: sc('tr-zap-gremlins'), run: zapGremlins },
    { key: sc('tr-strip-duplicate-spaces'), run: stripDuplicateSpaces },
    { key: sc('tr-italics-to-quotes'), run: italicsToQuotes },
    { key: sc('tr-quotes-to-italics'), run: view => quotesToItalics(view.state.field(configField).italicFormatting)(view) },
    { key: sc('tr-remove-line-breaks'), run: removeLineBreaks },
    { key: sc('tr-straighten-quotes'), run: straightenQuotes },
    { key: sc('tr-quotes-to-magic'), run: view => {
      const { magicQuotes } = view.state.field(configField).autocorrect
      const primary = magicQuotes.primary.split('\u2026') as [string, string]
      const secondary = magicQuotes.secondary.split('\u2026') as [string, string]
      return curlQuotes(primary, secondary)(view)
    }
    },
    { key: sc('tr-ensure-double-quotes'), run: toDoubleQuotes },
    { key: sc('tr-double-quotes-to-single'), run: doubleQuotesToSingle },
    { key: sc('tr-single-quotes-to-double'), run: singleQuotesToDouble },
    { key: sc('tr-emdash-add-spaces'), run: addSpacesAroundEmdashes },
    { key: sc('tr-emdash-remove-spaces'), run: removeSpacesAroundEmdashes },
    { key: sc('tr-sentence-case'), run: toSentenceCase(String(window.config.get('appLang'))) },
    { key: sc('tr-title-case'), run: toTitleCase(String(window.config.get('appLang'))) },

    { key: sc('autocomplete-invoke'), run: startCompletion },
    { key: sc('autocomplete-accept'), run: acceptCompletion },

    { key: 'Mod-b', run: applyBold },
    { key: 'Mod-i', run: applyItalic },
    { key: 'Mod-t', run: applyTaskList },
    { key: sc('md-insert-link'), run: insertLink },
    { key: sc('md-highlight'), run: applyHighlight },
    { key: sc('md-insert-image'), run: insertImage },
    { key: 'Mod-Shift-c', run: applyComment },
    { key: sc('md-insert-footnote'), run: addNewFootnote },

    // historyKeymap, but with our own keyboard shortcuts
    { key: 'Mod-z', run: undo, preventDefault: true },
    { key: 'Mod-Shift-z', run: redo, preventDefault: true },
    { key: sc('selection-undo'), run: undoSelection, preventDefault: true },
    { key: sc('selection-redo'), run: redoSelection, preventDefault: true },

    // searchKeymap
    { key: 'Mod-f', run: openSearchPanel, scope: 'editor search-panel' },
    { key: sc('search-find-next'), run: findNext, scope: 'editor search-panel', preventDefault: true },
    { key: sc('search-find-previous'), run: findPrevious, scope: 'editor search-panel', preventDefault: true },
    { key: sc('search-select-matches'), run: selectSelectionMatches },
    { key: sc('search-go-to-line'), run: gotoLine },
    { key: sc('search-select-next'), run: selectNextOccurrence, preventDefault: true },

    // foldKeymap
    { key: sc('folding-fold-at-cursor'), run: foldCode },
    { key: sc('folding-unfold-at-cursor'), run: unfoldCode },
    { key: sc('folding-fold-all'), run: foldAll },
    { key: sc('folding-unfold-all'), run: unfoldAll },

    { key: sc('selection-line'), run: selectLine },
    { key: sc('selection-parent-syntax'), run: selectParentSyntax, preventDefault: true },

    { key: 'Mod-[', run: indentLess },
    { key: 'Mod-]', run: indentMore },
    { key: sc('selection-indent'), run: indentSelection },

    { key: 'Shift-Mod-k', run: deleteLine },

    { key: 'Shift-Mod-\\', run: cursorMatchingBracket },

    { key: sc('edit-toggle-comment'), run: toggleComment },
    { key: sc('edit-toggle-block-comment'), run: toggleBlockComment },

    { key: sc('misc-toggle-tab-focus'), run: toggleTabFocusMode },

    // Modified emacs style keymap as taken from CodeMirror
    { mac: 'Ctrl-b', run: cursorCharLeft, shift: selectCharLeft, preventDefault: true },
    { mac: 'Ctrl-f', run: cursorCharRight, shift: selectCharRight },

    { mac: 'Ctrl-p', run: cursorLineUp, shift: selectLineUp },
    { mac: 'Ctrl-n', run: cursorLineDown, shift: selectLineDown },

    { mac: 'Ctrl-a', run: cursorLineStart, shift: selectLineStart },
    { mac: 'Ctrl-e', run: cursorLineEnd, shift: selectLineEnd },

    { mac: 'Ctrl-d', run: deleteCharForward },
    { mac: 'Ctrl-h', run: deleteCharBackward },
    { mac: 'Ctrl-k', run: deleteToLineEnd },
    { mac: 'Ctrl-Alt-h', run: deleteGroupBackward },

    { mac: 'Ctrl-o', run: splitLine },
    { mac: 'Ctrl-t', run: transposeChars },

    { mac: 'Ctrl-v', run: cursorPageDown },

    // Table Editor Keys. These need to be the last, since they override some
    // commands and need to only run if nothing equivalently mapped can be run
    // within the corresponding cells.
    { key: sc('table-align-col-left'), run: alignLeft, preventDefault: true },
    { key: sc('table-align-col-center'), run: alignCenter, preventDefault: true },
    { key: sc('table-align-col-right'), run: alignRight, preventDefault: true },
    { key: sc('table-align'), run: v => alignTables(v, v.state.selection.main.head) }
  ]
}
