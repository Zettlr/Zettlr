/**
 * Saves the last highlighted line
 *
 * @var {Number}
 */
var lastHighlightLine = -1

/**
 * Enables muting of lines in the editor if the option is set
 *
 * @param   {CodeMirror}  cm  The instance
 */
module.exports = (cm) => {
  cm.on('cursorActivity', (cm) => {
    muteLines(cm)
  })
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
