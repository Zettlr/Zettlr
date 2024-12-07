import {
  acceptCompletion, closeCompletion, deleteBracketPair, moveCompletionSelection,
  startCompletion
} from '@codemirror/autocomplete'
import {
  insertNewlineAndIndent, copyLineUp, copyLineDown
} from '@codemirror/commands'
import { insertNewlineContinueMarkup } from '@codemirror/lang-markdown'
import type { Extension } from '@codemirror/state'
import { keymap } from '@codemirror/view'
import { nextSnippet, abortSnippet } from '../autocomplete/snippets'
import {
  handleReplacement, handleBackspace, handleQuote
} from '../commands/autocorrect'
import { addNewFootnote } from '../commands/footnotes'
import {
  maybeIndentList, maybeUnindentList, customMoveLineUp, customMoveLineDown
} from '../commands/lists'
import {
  insertLink, insertImage, applyBold, applyItalic, applyComment, applyTaskList
} from '../commands/markdown'
import { pasteAsPlain, copyAsHTML } from '../util/copy-paste-cut'
import { sharedKeymap } from './shared'

// Includes:
// * completionKeymap
// * our Zettlr-specific customKeymap
export function markdownKeymap (): Extension {
  return keymap.of([
    // completionKeymap
    { key: 'Escape', run: closeCompletion },
    { key: 'ArrowDown', run: moveCompletionSelection(true) },
    { key: 'ArrowUp', run: moveCompletionSelection(false) },
    { key: 'PageDown', run: moveCompletionSelection(true, 'page') },
    { key: 'PageUp', run: moveCompletionSelection(false, 'page') },
    { key: 'Enter', run: acceptCompletion },

    // customKeymap

    // Adding Markdown syntax elements
    { key: 'Mod-b', run: applyBold },
    { key: 'Mod-i', run: applyItalic },
    { key: 'Mod-k', run: insertLink },
    // NOTE: We have to do it like this, because the Mod-Shift-i is occupied on
    // Windows/Linux by the DevTools shortcut, and Mod-Alt-i is the same for Mac.
    { key: 'Mod-Alt-i', mac: 'Mod-Shift-i', run: insertImage },
    { key: 'Mod-Shift-c', run: applyComment },
    { key: 'Mod-Alt-f', mac: 'Mod-Alt-r', run: addNewFootnote },

    // Overload Tab, depending on context (priority high->low)
    { key: 'Tab', run: acceptCompletion },
    { key: 'Tab', run: nextSnippet },
    { key: 'Tab', run: maybeIndentList, shift: maybeUnindentList },

    // Overload Enter
    { key: 'Enter', run: handleReplacement },
    // If no replacement can be handled, the default should be newlineAndIndent
    { key: 'Enter', run: insertNewlineContinueMarkup },
    { key: 'Enter', run: insertNewlineAndIndent },

    // Overload Backspace
    { key: 'Backspace', run: deleteBracketPair },
    { key: 'Backspace', run: handleBackspace },

    { key: 'Esc', run: abortSnippet },
    { key: 'Space', run: handleReplacement },

    { key: 'Alt-ArrowUp', run: customMoveLineUp, shift: copyLineUp },
    { key: 'Alt-ArrowDown', run: customMoveLineDown, shift: copyLineDown },
    { key: 'Mod-t', run: applyTaskList },
    { key: 'Mod-Shift-v', run: view => { pasteAsPlain(view); return true } },
    { key: 'Mod-Alt-c', run: view => { copyAsHTML(view); return true } },
    { key: '"', run: handleQuote('"') },
    { key: "'", run: handleQuote("'") },

    // Include the sharedKeymap at the end to make the defaults available, but
    // with a lower priority, so that we can override anything in this keymap.
    ...sharedKeymap,
  ])
}
