import { deleteBracketPair } from '@codemirror/autocomplete'
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
import {
  openSearchPanel, findNext, findPrevious, closeSearchPanel,
  selectSelectionMatches, gotoLine, selectNextOccurrence
} from '@codemirror/search'
import type { KeyBinding } from '@codemirror/view'

// Includes:
// * defaultKeymap
// * historyKeymap
// * closeBracketsKeymap
// * searchKeymap
export const sharedKeymap: KeyBinding[] = [
  // Custom key bindings for Zettlr
  { key: 'Tab', run: indentMore, shift: indentLess },

  // historyKeymap, but with our own keyboard shortcuts
  { key: 'Mod-z', run: undo, preventDefault: true },
  { key: 'Mod-Shift-z', run: redo, preventDefault: true },
  { key: 'Mod-u', run: undoSelection, preventDefault: true },
  { key: 'Alt-u', mac: 'Mod-Shift-u', run: redoSelection, preventDefault: true },

  // closeBracketsKeymap
  { key: 'Backspace', run: deleteBracketPair },

  // searchKeymap
  { key: 'Mod-f', run: openSearchPanel, scope: 'editor search-panel' },
  { key: 'F3', run: findNext, shift: findPrevious, scope: 'editor search-panel', preventDefault: true },
  { key: 'Mod-g', run: findNext, shift: findPrevious, scope: 'editor search-panel', preventDefault: true },
  { key: 'Escape', run: closeSearchPanel, scope: 'editor search-panel' },
  { key: 'Mod-Shift-l', run: selectSelectionMatches },
  { key: 'Mod-Alt-g', run: gotoLine },
  { key: 'Mod-d', run: selectNextOccurrence, preventDefault: true },

  // defaultKeymap
  { key: 'Alt-ArrowLeft', mac: 'Ctrl-ArrowLeft', run: cursorSyntaxLeft, shift: selectSyntaxLeft },
  { key: 'Alt-ArrowRight', mac: 'Ctrl-ArrowRight', run: cursorSyntaxRight, shift: selectSyntaxRight },

  { key: 'Alt-ArrowUp', run: moveLineUp },
  { key: 'Shift-Alt-ArrowUp', run: copyLineUp },

  { key: 'Alt-ArrowDown', run: moveLineDown },
  { key: 'Shift-Alt-ArrowDown', run: copyLineDown },

  { key: 'Escape', run: simplifySelection },
  { key: 'Mod-Enter', run: insertBlankLine },

  { key: 'Alt-l', mac: 'Ctrl-l', run: selectLine },
  { key: 'Mod-i', run: selectParentSyntax, preventDefault: true },

  { key: 'Mod-[', run: indentLess },
  { key: 'Mod-]', run: indentMore },
  { key: 'Mod-Alt-\\', run: indentSelection },

  { key: 'Shift-Mod-k', run: deleteLine },

  { key: 'Shift-Mod-\\', run: cursorMatchingBracket },

  { key: 'Mod-/', run: toggleComment },
  { key: 'Alt-A', run: toggleBlockComment },

  { key: 'Ctrl-m', mac: 'Shift-Alt-m', run: toggleTabFocusMode },

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
]
