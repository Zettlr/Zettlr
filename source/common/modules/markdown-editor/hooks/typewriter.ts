/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        CodeMirror typewriter hook
 * CVM-Role:        CodeMirror plugin
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Enables the typewriter mode on the CodeMirror editor.
 *
 * END HEADER
 */

import CodeMirror from 'codemirror'

/**
 * Saves the last highlighted line
 *
 * @var {Number}
 */
let lastHighlightLine = -1

/**
 * Enables a typewriter-like mode if the option is set
 *
 * @param   {CodeMirror.Editor}  cm  The instance
 */
export default function typewriterHook (cm: CodeMirror.Editor): void {
  cm.on('change', typewriterHighlight)
  cm.on('change', typewriterScroll)
  cm.on('optionChange', typewriterHighlight)
  cm.on('optionChange', typewriterScroll)

  // On cursor activity we only adapt the highlights, but we don't scroll
  cm.on('cursorActivity', typewriterHighlight)
}

/**
 * Adds the mute class to all lines if the option is set
 *
 * @param   {CodeMirror.Editor}  cm  The CodeMirror instance
 */
function typewriterHighlight (cm: CodeMirror.Editor): void {
  if ((cm as any).getOption('zettlr').typewriterMode === false) {
    if (lastHighlightLine > -1) {
      // Cleanup after option change
      cm.removeLineClass(lastHighlightLine, 'background', 'typewriter-active-line')
      cm.removeLineClass(lastHighlightLine, 'text', 'typewriter-active-line')
      const codeElement = cm.getWrapperElement().querySelector('.CodeMirror-code') as HTMLDivElement
      codeElement.style.marginTop = ''
      codeElement.style.marginBottom = ''
      lastHighlightLine = -1
      cm.refresh()
    }
    return
  }

  let highlightLine = cm.getCursor().line

  // If the highlight line has changed, we need to re-apply the line classes
  if (highlightLine !== lastHighlightLine) {
    // Line has changed
    for (let i = 0; i < cm.lineCount(); i++) {
      if (highlightLine === i) {
        cm.addLineClass(i, 'background', 'typewriter-active-line')
        cm.addLineClass(i, 'text', 'typewriter-active-line')
      } else {
        cm.removeLineClass(i, 'background', 'typewriter-active-line')
        cm.removeLineClass(i, 'text', 'typewriter-active-line')
      }
    }

    // (Re-)set the margins, if applicable
    const codeElement = cm.getWrapperElement().querySelector('.CodeMirror-code') as HTMLDivElement
    if (codeElement.style.marginTop === '') {
      const margin = window.innerHeight
      codeElement.style.marginTop = `${margin}px`
      codeElement.style.marginBottom = `${margin}px`
      cm.refresh()
    }
  }

  lastHighlightLine = highlightLine
}

/**
 * Scrolls during typewriter activity
 *
 * @param   {CodeMirror.Editor}  cm  The editor instance
 */
function typewriterScroll (cm: CodeMirror.Editor): void {
  if ((cm as any).getOption('zettlr').typewriterMode === false) {
    // Just return. The cleanup is being done in the highlight function.
    return
  }

  // Scroll the cursor line to the center of the screen.
  cm.cursorCoords(cm.getCursor())
  const cursorTop = cm.charCoords(cm.getCursor(), 'local').top
  const middleHeight = cm.getScrollerElement().offsetHeight / 2
  cm.scrollTo(null, cursorTop - middleHeight - 5)
}
