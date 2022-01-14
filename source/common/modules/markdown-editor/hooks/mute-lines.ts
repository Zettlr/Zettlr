/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        CodeMirror mute-lines hook
 * CVM-Role:        CodeMirror plugin
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Mutes lines that do not contain a cursor by regulating down
 *                  the opacity of the text. NOTE that this plugin is currently
 *                  not used since the distraction free mode is not implemented.
 *
 * END HEADER
 */

import CodeMirror from 'codemirror'

/**
 * Saves the last highlighted line
 *
 * @var {Number}
 */
const highlights = new Set()

/**
 * Enables muting of lines in the editor if the option is set
 *
 * @param   {CodeMirror.Editor}  cm  The instance
 */
export default function muteLinesHook (cm: CodeMirror.Editor): void {
  cm.on('cursorActivity', muteLines)
  cm.on('optionChange', muteLines)
}

/**
 * Adds the mute class to all lines if the option is set
 *
 * @param   {CodeMirror.Editor}  cm  The CodeMirror instance
 */
function muteLines (cm: CodeMirror.Editor): void {
  if ((cm as any).getOption('zettlr').muteLines === false || (cm as any).getOption('fullScreen') === false) {
    if (highlights.size > 0) {
      // Clean up after the option has been disabled
      for (let i = 0; i < cm.lineCount(); i++) {
        cm.removeLineClass(i, 'text', 'mute')
      }
      highlights.clear()
    }
    return
  }

  highlights.clear()

  if (cm.somethingSelected()) {
    const sels = cm.listSelections()
    for (const sel of sels) {
      // Determine the beginning and end of the current selection
      const startLine = (sel.anchor.line > sel.head.line) ? sel.head.line : sel.anchor.line
      const endLine = (startLine === sel.head.line) ? sel.anchor.line : sel.head.line
      // Add all lines in between to the set
      for (let i = startLine; i <= endLine; i++) {
        highlights.add(i)
      }
    }
  } else {
    // If nothing was selected, we only need the cursor line
    highlights.add(cm.getCursor().line)
  }

  for (let i = 0; i < cm.lineCount(); i++) {
    if (highlights.has(i)) {
      cm.removeLineClass(i, 'text', 'mute')
    } else {
      cm.addLineClass(i, 'text', 'mute')
    }
  }
}
