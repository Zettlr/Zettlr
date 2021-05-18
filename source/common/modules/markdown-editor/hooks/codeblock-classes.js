/**
 * Hooks onto the cursorActivity event to apply codeblock classes
 *
 * @param   {CodeMirror}  cm  The instance
 */
module.exports = (cm) => {
  cm.on('cursorActivity', applyCodeblockClasses)
  cm.on('optionChange', applyCodeblockClasses)
}

function applyCodeblockClasses (cm) {
  let needsRefresh = false // Will be set to true if at least one line has been altered
  let isCodeBlock = false
  let codeblockClass = 'code-block-line'

  // This matches a line that starts with at most three spaces, followed by at
  // least three backticks or tildes (fenced code block).
  const codeBlockRE = /^(?:\s{0,3}`{3}|~{3}).*/
  // This one, on the other hand, matches indented code blocks starting with at
  // least four spaces.
  const indentedRE = /^\s{4,}.*$/
  // The old regex was: /^(?:`{3}|~{3}).*/

  // Buffer changes
  cm.startOperation()

  for (let i = 0; i < cm.lineCount(); i++) {
    // First, get the line and the info whether it's currently a code block line
    const info = cm.lineInfo(i)
    const line = info.text
    const wrapClass = (info.wrapClass !== undefined) ? String(info.wrapClass) : ''
    const isCurrentlyCode = wrapClass.includes(codeblockClass)

    // Second, check if we are NOT inside a fenced code block. If we're not, but
    // the line is indented by at least four spaces, we have an indented code
    // block. That doesn't trigger the code block variable, but renders only
    // this line as a codeblock.
    if (!isCodeBlock && indentedRE.test(line)) {
      if (!isCurrentlyCode) {
        cm.addLineClass(i, 'wrap', codeblockClass)
        needsRefresh = true
      }
      continue // No need to check the rest
    }

    // Each code block line toggles the isCodeBlock variable (but the
    // codeblocks themselves should not be styled)
    if (codeBlockRE.test(line)) {
      isCodeBlock = !isCodeBlock
      if (isCurrentlyCode) {
        cm.removeLineClass(i, 'wrap', codeblockClass)
        needsRefresh = true
      }
      continue
    }

    if (isCodeBlock && !isCurrentlyCode) {
      // We should render as code
      cm.addLineClass(i, 'wrap', codeblockClass)
      needsRefresh = true
    } else if (!isCodeBlock && isCurrentlyCode) {
      // We should not render as code
      cm.removeLineClass(i, 'wrap', codeblockClass)
      needsRefresh = true
    } // Else: Leave the line as it is
  }

  // End operation (apply the buffer to the layout and force a repaint)
  cm.endOperation()

  // If at least one line was altered, we need a refresh
  if (needsRefresh) {
    cm.refresh()
  }
}
