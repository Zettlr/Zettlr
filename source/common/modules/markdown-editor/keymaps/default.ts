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

import { nextSnippet, abortSnippet } from '../autocomplete/snippets'
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
    // completionKeymap
    { key: sc('autocomplete-invoke'), run: startCompletion },
    { key: 'Escape', run: closeCompletion },
    { key: 'ArrowDown', run: moveCompletionSelection(true) },
    { key: 'ArrowUp', run: moveCompletionSelection(false) },
    { key: 'PageDown', run: moveCompletionSelection(true, 'page') },
    { key: 'PageUp', run: moveCompletionSelection(false, 'page') },
    { key: sc('autocomplete-accept'), run: acceptCompletion },

    // markdownKeymap

    // Adding Markdown syntax elements
    { key: 'Mod-b', run: applyBold },
    { key: 'Mod-i', run: applyItalic },
    { key: sc('md-insert-link'), run: insertLink },
    { key: sc('md-highlight'), run: applyHighlight },
    // NOTE: We have to do it like this, because the Mod-Shift-i is occupied on
    // Windows/Linux by the DevTools shortcut, and Mod-Alt-i is the same for Mac.
    { key: sc('md-insert-image'), run: insertImage },
    { key: 'Mod-C', run: applyComment },
    { key: sc('md-insert-footnote'), run: addNewFootnote },

    // Overload Tab, depending on context (priority high->low)
    { key: 'Tab', run: acceptCompletion },
    { key: 'Tab', run: nextSnippet },
    { key: 'Tab', run: moveNextCell, shift: movePrevCell },
    { key: 'Tab', run: maybeIndentList, shift: maybeUnindentList },
    { key: 'Tab', run: insertTabOrSpace },

    // Overload Enter
    { key: 'Enter', run: handleAutocorrectEnter },
    { key: 'Enter', run: moveNextRow, shift: movePrevRow },
    // If no replacement can be handled, the default should be newlineAndIndent
    { key: 'Enter', run: insertNewlineContinueMarkup },
    { key: 'Enter', run: insertNewlineAndIndent },

    // Overload Backspace
    { key: 'Backspace', run: selectFootnoteBeforeDelete },
    { key: 'Backspace', run: deleteMarkupBackward },
    // closeBracketsKeymap
    { key: 'Backspace', run: deleteBracketPair },
    { key: 'Backspace', run: handleBackspace },

    { key: 'Escape', run: abortSnippet },
    { key: 'Escape', run: closeSearchPanel },
    { key: 'Space', run: handleAutocorrectSpace },

    { key: 'Alt-ArrowUp', run: customMoveLineUp, shift: copyLineUp },
    { key: 'Alt-ArrowDown', run: customMoveLineDown, shift: copyLineDown },
    { key: 'Mod-t', run: applyTaskList },
    { key: 'Mod-Shift-v', run: view => { pasteAsPlain(view); return true } },
    { key: 'Mod-Alt-c', run: view => { copyAsHTML(view); return true } },
    { key: '"', run: handleQuote('"') },
    { key: "'", run: handleQuote("'") },

    // Now follows the original sharedKeymap to make the defaults available, but
    // with a lower priority, so that we can override anything in this keymap.
    // Custom key bindings for Zettlr
    { key: 'Tab', run: indentMore, shift: indentLess },

    // historyKeymap, but with our own keyboard shortcuts
    { key: 'Mod-z', run: undo, preventDefault: true },
    { key: 'Mod-Shift-z', run: redo, preventDefault: true },
    { key: sc('selection-undo'), run: undoSelection, preventDefault: true },
    { key: sc('selection-redo'), run: redoSelection, preventDefault: true },

    // searchKeymap
    { key: 'Mod-f', run: openSearchPanel, scope: 'editor search-panel' },
    { key: sc('search-find-next'), run: findNext, scope: 'editor search-panel', preventDefault: true },
    { key: sc('search-find-previous'), run: findPrevious, scope: 'editor search-panel', preventDefault: true },
    { key: 'Escape', run: closeSearchPanel, scope: 'editor search-panel' },
    { key: sc('search-select-matches'), run: selectSelectionMatches },
    { key: sc('search-go-to-line'), run: gotoLine },
    { key: sc('search-select-next'), run: selectNextOccurrence, preventDefault: true },

    // foldKeymap
    { key: sc('folding-fold-at-cursor'), run: foldCode },
    { key: sc('folding-unfold-at-cursor'), run: unfoldCode },
    { key: sc('folding-fold-all'), run: foldAll },
    { key: sc('folding-unfold-all'), run: unfoldAll },

    // defaultKeymap
    { key: 'Alt-ArrowLeft', mac: 'Ctrl-ArrowLeft', run: cursorSyntaxLeft, shift: selectSyntaxLeft },
    { key: 'Alt-ArrowRight', mac: 'Ctrl-ArrowRight', run: cursorSyntaxRight, shift: selectSyntaxRight },

    { key: 'Alt-ArrowUp', run: moveLineUp },
    { key: 'Shift-Alt-ArrowUp', run: copyLineUp },

    { key: 'Alt-ArrowDown', run: moveLineDown },
    { key: 'Shift-Alt-ArrowDown', run: copyLineDown },

    { key: 'Escape', run: simplifySelection },
    { key: 'Mod-Enter', run: insertBlankLine },

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

    // Standard keymap
    { key: 'ArrowLeft', run: cursorCharLeft, shift: selectCharLeft, preventDefault: true },
    { key: 'Mod-ArrowLeft', mac: 'Alt-ArrowLeft', run: cursorGroupLeft, shift: selectGroupLeft, preventDefault: true },
    { mac: 'Cmd-ArrowLeft', run: cursorLineBoundaryLeft, shift: selectLineBoundaryLeft, preventDefault: true },
    { key: 'ArrowRight', run: cursorCharRight, shift: selectCharRight, preventDefault: true },
    { key: 'Mod-ArrowRight', mac: 'Alt-ArrowRight', run: cursorGroupRight, shift: selectGroupRight, preventDefault: true },
    { mac: 'Cmd-ArrowRight', run: cursorLineBoundaryRight, shift: selectLineBoundaryRight, preventDefault: true },
    { key: 'ArrowUp', run: cursorLineUp, shift: selectLineUp, preventDefault: true },
    { mac: 'Cmd-ArrowUp', run: cursorDocStart, shift: selectDocStart },
    { mac: 'Ctrl-ArrowUp', run: cursorPageUp, shift: selectPageUp },
    { key: 'ArrowDown', run: cursorLineDown, shift: selectLineDown, preventDefault: true },
    { mac: 'Cmd-ArrowDown', run: cursorDocEnd, shift: selectDocEnd },
    { mac: 'Ctrl-ArrowDown', run: cursorPageDown, shift: selectPageDown },
    { key: 'PageUp', run: cursorPageUp, shift: selectPageUp },
    { key: 'PageDown', run: cursorPageDown, shift: selectPageDown },
    { key: 'Home', run: cursorLineBoundaryBackward, shift: selectLineBoundaryBackward, preventDefault: true },
    { key: 'Mod-Home', run: cursorDocStart, shift: selectDocStart },
    { key: 'End', run: cursorLineBoundaryForward, shift: selectLineBoundaryForward, preventDefault: true },
    { key: 'Mod-End', run: cursorDocEnd, shift: selectDocEnd },
    { key: 'Enter', run: insertNewlineAndIndent, shift: insertNewlineAndIndent },
    { key: 'Mod-a', run: selectAll },
    { key: 'Backspace', run: deleteCharBackward, shift: deleteCharBackward },
    { key: 'Delete', run: deleteCharForward },
    { key: 'Mod-Backspace', mac: 'Alt-Backspace', run: deleteGroupBackward },
    { key: 'Mod-Delete', mac: 'Alt-Delete', run: deleteGroupForward },
    { mac: 'Mod-Backspace', run: deleteLineBoundaryBackward },
    { mac: 'Mod-Delete', run: deleteLineBoundaryForward },

    // Table Editor Keys. These need to be the last, since they override some
    // commands and need to only run if nothing equivalently mapped can be run
    // within the corresponding cells.
    { key: sc('table-align-col-left'), run: alignLeft, preventDefault: true },
    { key: sc('table-align-col-center'), run: alignCenter, preventDefault: true },
    { key: sc('table-align-col-right'), run: alignRight, preventDefault: true },
    { key: sc('table-align'), run: v => alignTables(v, v.state.selection.main.head) },
    { key: 'Alt-ArrowUp', run: swapPrevRow },
    { key: 'Alt-Shift-ArrowUp', run: addRowBefore },
    { key: 'Alt-ArrowDown', run: swapNextRow },
    { key: 'Alt-Shift-ArrowDown', run: addRowAfter },
    { key: 'Alt-ArrowRight', run: swapNextCol },
    { key: 'Alt-Shift-ArrowRight', run: addColAfter },
    { key: 'Alt-ArrowLeft', run: swapPrevCol },
    { key: 'Alt-Shift-ArrowLeft', run: addColBefore },
    { key: 'Mod-Alt-j', run: removeLineBreaks }
  ]
}
