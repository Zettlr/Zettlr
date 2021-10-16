/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        CodeMirror codeblock hook
 * CVM-Role:        CodeMirror plugin
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Adds Codeblock line classes where applicable.
 *
 * END HEADER
 */

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
  let codeblockLines = []
  let codeblockClass = 'code-block-line'
  let codeblockClassOpen = 'code-block-first-line'
  let codeblockClassClose = 'code-block-last-line'
  let lineNum = 0
  let blockFenced = false
  const lineCount = cm.lineCount()
  const codeBlockRE = /^(?:\s{0,3}`{3}|~{3}).*/
  const indentedRE = /^\s{4,}.*$/

  // Buffer changes
  cm.startOperation()

  // Check lines for code blocks
  cm.eachLine(function (line) {
    if (blockFenced) codeblockLines.push(lineNum)

    if (codeBlockRE.test(line.text)) {
      blockFenced = !blockFenced
      if (!blockFenced) codeblockLines.pop()
    }

    if (!blockFenced && line.styles && !line.styles.includes('formatting') && indentedRE.test(line.text)) {
      // Temporarily disabled. I need to hook into wherever CodeMirror does its
      // parsing, because this only applies to what's visible.
      // codeblockLines.push(lineNum) // Disabled because of issue #2637
    }

    lineNum++
  })

  codeblockLines.forEach(function (lineNum, index, lines) {
    cm.addLineClass(lineNum, 'wrap', codeblockClass)

    // if previous line is not code
    if (lines[index - 1] !== lineNum - 1) {
      cm.addLineClass(lineNum, 'wrap', codeblockClassOpen)

      // If this was caused by backspacing the first line of indented code, we
      // need to explicitly clean up the classes
      if (index >= 0) {
        cm.removeLineClass(lineNum - 1, 'wrap', codeblockClass)
        cm.removeLineClass(lineNum - 1, 'wrap', codeblockClassOpen)
      }
    } else {
      cm.removeLineClass(lineNum, 'wrap', codeblockClassOpen)
    }

    // if next line is not code
    if (lines[index + 1] !== lineNum + 1) {
      cm.addLineClass(lineNum, 'wrap', codeblockClassClose)

      // If this was caused by backspacing the last line of indented code, we
      // need to explicitly clean up the classes
      if (index < lineCount) {
        cm.removeLineClass(lineNum + 1, 'wrap', codeblockClass)
        cm.removeLineClass(lineNum + 1, 'wrap', codeblockClassClose)
      }
    } else {
      cm.removeLineClass(lineNum, 'wrap', codeblockClassClose)
    }

    // If last line is code, make sure to close the class
    if (lineNum === lineCount - 1) {
      cm.addLineClass(lineNum, 'wrap', codeblockClass)
      cm.addLineClass(lineNum, 'wrap', codeblockClassClose)
    }
  })

  if (codeblockLines.length) {
    cm.refresh()
  }

  // End operation (apply the buffer to the layout and force a repaint)
  cm.endOperation()
}
