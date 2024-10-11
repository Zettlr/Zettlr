/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Keymap
 * CVM-Role:        Extension
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This is our base keymap.
 *
 * END HEADER
 */

import { acceptCompletion, deleteBracketPair } from '@codemirror/autocomplete'
import { copyLineDown, copyLineUp, indentLess, indentMore, insertNewlineAndIndent } from '@codemirror/commands'
import { type KeyBinding } from '@codemirror/view'
import { abortSnippet, nextSnippet } from '../autocomplete/snippets'
import { copyAsHTML, pasteAsPlain } from '../util/copy-paste-cut'
import { handleReplacement, handleBackspace, handleQuote } from './autocorrect'
import { addNewFootnote } from './footnotes'
import { maybeIndentList, maybeUnindentList, customMoveLineUp, customMoveLineDown } from './lists'
import { insertLink, insertImage, applyBold, applyItalic, applyComment, applyTaskList } from './markdown'
import { insertNewlineContinueMarkup } from '@codemirror/lang-markdown'
import { moveNextCell, moveNextRow, movePrevCell, movePrevRow, swapNextCol, swapNextRow, swapPrevCol, swapPrevRow } from './tables'

/**
 * Zettlr's custom keymap. It defines many of the default key bindings
 *
 * @var {KeyBinding[]}
 */
export const customKeymap: KeyBinding[] = [
  // First, the most specific commands: Tables
  { key: 'Tab', run: moveNextCell, shift: movePrevCell },
  { key: 'Enter', run: moveNextRow, shift: movePrevRow },
  { key: 'Alt-Enter', run: swapNextRow, shift: swapPrevRow },
  // TODO: Find key{ key: undefined, run: swapNextCol, shift: swapPrevCol },
  // ------------------------------
  { key: 'Mod-k', run: insertLink },
  // NOTE: We have to do it like this, because the Mod-Shift-i is occupied on
  // Windows/Linux by the DevTools shortcut, and Mod-Alt-i is the same for Mac.
  { key: 'Mod-Alt-i', mac: 'Mod-Shift-i', run: insertImage },
  { key: 'Mod-b', run: applyBold },
  { key: 'Mod-i', run: applyItalic },
  { key: 'Mod-Shift-c', run: applyComment },
  { key: 'Mod-Alt-f', mac: 'Mod-Alt-r', run: addNewFootnote },
  { key: 'Tab', run: acceptCompletion },
  { key: 'Tab', run: nextSnippet },
  { key: 'Tab', run: maybeIndentList, shift: maybeUnindentList },
  { key: 'Tab', run: indentMore, shift: indentLess },
  { key: 'Esc', run: abortSnippet },
  { key: 'Space', run: handleReplacement },
  { key: 'Enter', run: handleReplacement },
  // If no replacement can be handled, the default should be newlineAndIndent
  { key: 'Enter', run: insertNewlineContinueMarkup },
  { key: 'Enter', run: insertNewlineAndIndent },
  // TODO: We're including the pre-made keymap that defines the next line
  // already in our core extensions (see editor-extension-sets.ts), but somehow
  // it never gets called if we don't also define it here. Double check why.
  { key: 'Backspace', run: deleteBracketPair },
  { key: 'Backspace', run: handleBackspace },
  { key: 'Alt-ArrowUp', run: customMoveLineUp, shift: copyLineUp },
  { key: 'Alt-ArrowDown', run: customMoveLineDown, shift: copyLineDown },
  { key: 'Mod-t', run: applyTaskList },
  { key: 'Mod-Shift-v', run: view => { pasteAsPlain(view); return true } },
  { key: 'Mod-Alt-c', run: view => { copyAsHTML(view); return true } },
  { key: '"', run: handleQuote('"') },
  { key: "'", run: handleQuote("'") }
]
