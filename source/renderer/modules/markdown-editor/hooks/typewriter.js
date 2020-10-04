/**
 * Saves the last highlighted line
 *
 * @var {Number}
 */
var lastHighlightLine = -1

/**
 * Enables a typewriter-like mode if the option is set
 *
 * @param   {CodeMirror}  cm  The instance
 */
module.exports = (cm) => {
  cm.on('cursorActivity', (cm) => {
    typewriter(cm)
  })
}

/**
 * Adds the mute class to all lines if the option is set
 *
 * @param   {CodeMirror}  cm  The CodeMirror instance
 */
function typewriter (cm) {
  // TODO: Apply bigger margins to the beginning and end of the document to REALLY keep the lines in the middle
  if (!cm.getOption('zettlr').typewriterMode) {
    if (lastHighlightLine > -1) {
      // Cleanup after option change
      cm.removeLineClass(lastHighlightLine, 'text', 'typewriter-active-line')
      const codeElement = cm.getWrapperElement().querySelector('.CodeMirror-code')
      codeElement.style.marginTop = ''
      codeElement.style.marginBottom = ''
      lastHighlightLine = -1
    }
    return
  }

  let highlightLine = cm.getCursor().line

  // If the highlight line has changed, we need to re-apply the line classes
  if (highlightLine !== lastHighlightLine) {
    // Line has changed
    for (let i = 0; i < cm.lineCount(); i++) {
      if (highlightLine === i) {
        cm.addLineClass(i, 'text', 'typewriter-active-line')
      } else {
        cm.removeLineClass(i, 'text', 'typewriter-active-line')
      }
    }

    // (Re-)set the margins, if applicable
    const codeElement = cm.getWrapperElement().querySelector('.CodeMirror-code')
    if (codeElement.style.marginTop === '') {
      const margin = window.innerHeight
      codeElement.style.marginTop = margin + 'px'
      codeElement.style.marginBottom = margin + 'px'
    }
  }

  lastHighlightLine = highlightLine

  // Now the lines are correctly styled, BUT we also need to reposition the
  // cursor correctly
  cm.cursorCoords(cm.getCursor())
  const cursorTop = cm.charCoords(cm.getCursor(), 'local').top
  const middleHeight = cm.getScrollerElement().offsetHeight / 2
  cm.scrollTo(null, cursorTop - middleHeight - 5)
}
