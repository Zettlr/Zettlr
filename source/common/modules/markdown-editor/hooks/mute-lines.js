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

/**
 * Saves the last highlighted line
 *
 * @var {Number}
 */
let lastHighlightLine = -1

/**
 * Enables muting of lines in the editor if the option is set
 *
 * @param   {CodeMirror}  cm  The instance
 */
module.exports = (cm) => {
  cm.on('cursorActivity', muteLines)
  cm.on('optionChange', muteLines)
}

/**
 * Adds the mute class to all lines if the option is set
 *
 * @param   {CodeMirror}  cm  The CodeMirror instance
 */
function muteLines (cm) {
  if (!cm.getOption('zettlr').muteLines || !cm.getOption('fullScreen')) {
    if (lastHighlightLine > -1) {
      // Clean up after the option has been disabled
      for (let i = 0; i < cm.lineCount(); i++) {
        cm.removeLineClass(i, 'text', 'mute')
      }
      lastHighlightLine = -1
    }
    return
  }

  let highlightLine = cm.getCursor().line
  for (let i = 0; i < cm.lineCount(); i++) {
    if (highlightLine === i) {
      cm.removeLineClass(i, 'text', 'mute')
    } else {
      cm.addLineClass(i, 'text', 'mute')
    }
  }

  lastHighlightLine = highlightLine
}
