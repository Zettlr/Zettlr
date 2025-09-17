/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        TableEditor keymap
 * CVM-Role:        Utility
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This is the primary keymap for the TableEditor. It is
 *                  collocated with the other keymaps because it needs to
 *                  correspond to the `markdownKeymap`, and so it makes sense to
 *                  keep it here, and merely keep in mind that it heavily
 *                  relates to the TableEditor component.
 *
 * END HEADER
 */

import { undo, redo } from '@codemirror/commands'
import { type Extension } from '@codemirror/state'
import { type EditorView, keymap } from '@codemirror/view'
import { addColAfter, addColBefore, moveNextCell, movePrevCell, swapNextCol, swapPrevCol } from '../table-editor/commands/columns'
import { addRowAfter, addRowBefore, moveNextRow, movePrevRow, swapNextRow, swapPrevRow } from '../table-editor/commands/rows'
import { hiddenSpanField } from '../table-editor/subview'
import { deleteBracketPair } from '@codemirror/autocomplete'
import { applyBold, applyItalic, insertLink, insertImage, applyComment } from '../commands/markdown'
import { pasteAsPlain, copyAsHTML } from '../util/copy-paste-cut'
import { defaultKeymap } from './default'
import { handleBackspace, handleQuote } from '../commands/autocorrect'

/**
 * This command can be used to override the default selectAll functionality.
 * Instead of selecting the entire state (= document) it will only select the
 * cell boundaries.
 *
 * @param   {EditorView}  view  The editor view
 *
 * @return  {boolean}           Returns true
 */
function selectAllCommand (view: EditorView): boolean {
  const cursor = view.state.field(hiddenSpanField).cellRange
  view.dispatch({ selection: { anchor: cursor[0], head: cursor[1] } })
  return true
}

export function tableEditorKeymap (mainView: EditorView): Extension {
  // TODO: Disable alignment commands until custom keymapping is implemented
  // const alignLeft = setAlignment('left')
  // const alignCenter = setAlignment('center')
  // const alignRight = setAlignment('right')
  return [
    keymap.of([
      // Prevent programmatic insertion of newlines by disabling some
      // keybindings (except Enter which should move the cursor to the next
      // row if possible)
      {
        key: 'Enter',
        // NOTE: "?? true" ensures no other keybinding will be called after this.
        // This prevents the default behavior of inserting a newline character.
        run: _v => moveNextRow(mainView) ?? true,
        shift: _v => movePrevRow(mainView) ?? true
      },
      // Same for these two commands which disables these keybindings.
      { key: 'Ctrl-Enter', run: _v => true },
      { key: 'Mod-Enter', run: _v => true },
      // Map the undo/redo keys to the main view
      { key: 'Mod-z', run: _v => undo(mainView), preventDefault: true },
      { key: 'Mod-Shift-z', run: _v => redo(mainView), preventDefault: true },
      // Override the select all command
      { key: 'Mod-a', run: selectAllCommand, preventDefault: true },
      // Add a few more keyboard shortcuts.
      { key: 'Tab', run: _v => moveNextCell(mainView), shift: _v => movePrevCell(mainView) },
      // TODO: Disable alignment commands until custom keymapping is implemented
      // { key: 'Ctrl-l', run: _v => alignLeft(mainView), preventDefault: true },
      // { key: 'Ctrl-c', run: _v => alignCenter(mainView), preventDefault: true },
      // { key: 'Ctrl-r', run: _v => alignRight(mainView), preventDefault: true },
      // Further (relevant) keyboard commands (taken from the `markdownKeymap`).
      // NOTE: This is a subset of all commands, because block-based actions won't
      // work in the editor.
      { key: 'Mod-b', run: applyBold },
      { key: 'Mod-i', run: applyItalic },
      { key: 'Mod-k', run: insertLink },
      { key: 'Mod-Alt-i', mac: 'Mod-Shift-i', run: insertImage },
      { key: 'Mod-C', run: applyComment },

      { key: 'Backspace', run: handleBackspace },
      { key: 'Backspace', run: deleteBracketPair },

      { key: '"', run: handleQuote('"') },
      { key: "'", run: handleQuote("'") },

      { key: 'Mod-Shift-v', run: view => { pasteAsPlain(view); return true } },
      { key: 'Mod-Alt-c', run: view => { copyAsHTML(view); return true } },

      // These commands strictly speaking are block-based (or, rather, they go
      // beyond the current cell), but because they are very useful, we support
      // them here (but providing the main view which will handle them accordingly)
      // NOTE: They are beind `sharedKeymap` since the sharedKeymap for navigation
      // *within* the table cell needs to take precedence.
      { key: 'Alt-ArrowUp', mac: 'Ctrl-ArrowUp', run: _v => swapPrevRow(mainView), shift: _v => addRowBefore(mainView) },
      { key: 'Alt-ArrowDown', mac: 'Ctrl-ArrowDown', run: _v => swapNextRow(mainView), shift: _v => addRowAfter(mainView) },
      { key: 'Alt-ArrowRight', mac: 'Ctrl-ArrowRight', run: _v => swapNextCol(mainView), shift: _v => addColAfter(mainView) },
      { key: 'Alt-ArrowLeft', mac: 'Ctrl-ArrowLeft', run: _v => swapPrevCol(mainView), shift: _v => addColBefore(mainView) },
    ]),
    // Also include the sharedKeymap. The subview transaction filter will
    // automatically ensure that nothing spanning multiple lines will be executed.
    defaultKeymap()
  ]
}
