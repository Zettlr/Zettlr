/**
 * Hooks onto the cursorActivity event to apply codeblock classes
 *
 * @param   {CodeMirror}  cm  The instance
 */
module.exports = (cm) => {
  cm.on('cursorActivity', applyCodeblockClasses)
}

function applyCodeblockClasses (cm) {
  let needsRefresh = false // Will be set to true if at least one line has been altered
  let isCodeBlock = false
  let codeblockClass = 'code-block-line'

  // Buffer changes
  cm.startOperation()

  for (let i = 0; i < cm.lineCount(); i++) {
    // Each code block line toggles the isCodeBlock variable (but the
    // codeblocks themselves should not be styled)
    if (/^(?:`{3}|~{3}).*/.test(cm.getLine(i))) {
      isCodeBlock = !isCodeBlock
      cm.removeLineClass(i, 'wrap', codeblockClass)
      continue
    }

    let wrapClass = cm.lineInfo(i).wrapClass
    let isCurrentlyCode = (wrapClass) ? wrapClass.includes(codeblockClass) : false

    if (isCodeBlock && !isCurrentlyCode) {
      // We should render as code
      cm.addLineClass(i, 'wrap', codeblockClass)
      needsRefresh = true
    } else if (!isCodeBlock && isCurrentlyCode) {
      // We should not render as code
      cm.removeLineClass(i, 'wrap', codeblockClass)
      needsRefresh = true
    }
  }

  // End operation (apply the buffer to the layouting and force a repaint)
  cm.endOperation()

  // If at least one line was altered, we need a refresh
  if (needsRefresh) cm.refresh()
}
