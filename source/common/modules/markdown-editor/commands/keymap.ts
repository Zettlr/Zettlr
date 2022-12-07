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
import { copyLineDown, copyLineUp, indentLess, indentMore, moveLineDown, moveLineUp } from '@codemirror/commands'
import { KeyBinding } from '@codemirror/view'
import { abortSnippet, nextSnippet } from '../autocomplete/snippets'
import { copyAsHTML, paste, pasteAsPlain } from '../util/copy-paste-cut'
import { handleReplacement, handleBackspace, handleQuote } from './autocorrect'
import { addNewFootnote } from './footnotes'
import { maybeIndentList, maybeUnindentList } from './lists'
import { insertLink, insertImage, applyBold, applyItalic, applyComment, applyTaskList } from './markdown'

// Custom keymap implementing less complex keyboard shortcuts
export const customKeymap: KeyBinding[] = [
  { key: 'Mod-k', run: insertLink },
  { key: 'Mod-Alt-i', run: insertImage },
  { key: 'Mod-b', run: applyBold },
  { key: 'Mod-i', run: applyItalic },
  { key: 'Mod-Shift-c', run: applyComment },
  { key: 'Mod-Alt-r', run: addNewFootnote },
  { key: 'Tab', run: nextSnippet },
  { key: 'Tab', run: acceptCompletion },
  { key: 'Tab', run: maybeIndentList, shift: maybeUnindentList },
  { key: 'Tab', run: indentMore, shift: indentLess },
  { key: 'Esc', run: abortSnippet },
  { key: 'Space', run: handleReplacement },
  { key: 'Enter', run: handleReplacement },
  // TODO: We're including the pre-made keymap that defines the next line
  // already in our core extensions (see editor-extension-sets.ts), but somehow
  // it never gets called if we don't also define it here. Double check why.
  { key: 'Backspace', run: deleteBracketPair },
  { key: 'Backspace', run: handleBackspace },
  { key: 'Alt-Up', run: moveLineUp, shift: copyLineUp },
  { key: 'Alt-Down', run: moveLineDown, shift: copyLineDown },
  { key: 'Mod-t', run: applyTaskList },
  { key: 'Mod-v', run: view => { paste(view); return true }, shift: view => { pasteAsPlain(view); return true } },
  { key: 'Mod-Alt-c', run: view => { copyAsHTML(view); return true } },
  { key: '"', run: handleQuote('"') },
  { key: "'", run: handleQuote("'") }
]
