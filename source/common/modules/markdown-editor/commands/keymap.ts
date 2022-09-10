import { copyLineDown, copyLineUp, indentLess, indentMore, moveLineDown, moveLineUp } from '@codemirror/commands'
import { KeyBinding } from '@codemirror/view'
import { abortSnippet, nextSnippet } from '../autocomplete/snippets'
import { handleReplacement, handleBackspace, handleQuote } from './autocorrect'
import { addNewFootnote } from './footnotes'
import { maybeIndentList, maybeUnindentList } from './lists'
import { insertLink, insertImage, applyBold, applyItalic, applyComment } from './markdown'

// Custom keymap implementing less complex keyboard shortcuts
export const customKeymap: KeyBinding[] = [
  { key: 'Mod-k', run: insertLink },
  { key: 'Mod-Alt-i', run: insertImage },
  { key: 'Mod-b', run: applyBold },
  { key: 'Mod-i', run: applyItalic },
  { key: 'Mod-Shift-c', run: applyComment },
  { key: 'Mod-Alt-r', run: addNewFootnote },
  { key: 'Tab', run: nextSnippet },
  { key: 'Tab', run: maybeIndentList, shift: maybeUnindentList },
  { key: 'Tab', run: indentMore, shift: indentLess },
  { key: 'Esc', run: abortSnippet },
  { key: 'Space', run: handleReplacement },
  { key: 'Enter', run: handleReplacement },
  { key: 'Backspace', run: handleBackspace },
  { key: '"', run: handleQuote('"') },
  { key: "'", run: handleQuote("'") },
  { key: 'Alt-Up', run: moveLineUp, shift: copyLineUp },
  { key: 'Alt-Down', run: moveLineDown, shift: copyLineDown }
]
