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
const { debounce, range } = require('lodash')
const codeblockClass = 'code-block-line'
const codeblockClassOpen = 'code-block-first-line'
const codeblockClassClose = 'code-block-last-line'
// The debounce timeout needs to be exactly the same as but no less than the
// debounce timeout used in CodeMirror Markdown Mode.
const findCodeDebounced = debounce(findCode, 400, { leading: true })

/**
 * Hooks onto the cursorActivity, optionChange and keyHandled event to apply
 * codeblock classes. Everything is debounced, except the Enter key because
 * you'll want styling to be applied instantly when adding a line to a block.
 *
 * @param   {CodeMirror}  cm  The instance
 */
module.exports = (cm) => {
  cm.on('keyHandled', handleNewline)
  cm.on('cursorActivity', findCodeDebounced)
  cm.on('optionChange', findCodeDebounced)
}

/**
 * When pressing Enter inside a code block, do not debounce but make sure the
 * new line is styled properly immediately
 *
 * @param   {CodeMirror}  cm  The instance
 * @param   {String}  name  The key pressed
 */
function handleNewline (cm, name) {
  if (name === 'Enter') {
    findCode(cm)
  }
}

/**
 * Find fenced and indented code blocks. This is a hack.
 *
 * We really ought to extent the codeMirror GFM Mode to regex on the token
 * stream, because now we're mimicking Markdown Mode.
 *
 * Overriding means maintaining though, and Markdown Mode is quite complex.
 *
 * @param   {CodeMirror}  cm  The instance
 */
function findCode (cm) {
  const codeBlockLines = []
  const lineCount = cm.lineCount()
  const codeBlockRE = /^(?:\s{0,3}`{3}|~{3}).*/
  const indentedRE = /^\s{4,}.*$/
  const blankishRE = /^\s*$/

  // Check lines for code blocks
  for (let lineNum = 0; lineNum < lineCount; lineNum++) {
    let line = cm.getLine(lineNum)
    // Fenced code found
    if (codeBlockRE.test(line)) {
      // Find fenced code end
      while (lineNum + 1 < lineCount && !codeBlockRE.test(cm.getLine(lineNum + 1))) {
        codeBlockLines.push(++lineNum)
      }

      // Skip line that marks fenced code end
      lineNum++
    }

    // Possible match for indented code found
    if (indentedRE.test(line)) {
      let prevLine = lineNum - 1

      // Verify match
      // If this is the first line and either already indented code or prepended by an empty line
      if (prevLine >= 0 && (codeBlockLines.includes(prevLine) || blankishRE.test(cm.getLine(prevLine)))) {
        // If this is not preformatted markdown (e.g. a list)
        if (cm.getLineTokens(lineNum).some(token => String(token.type).includes('formatting-list')) === false) {
          let probeLine = 1

          // Skip ahead to the end of the potential code block
          while (lineNum + probeLine < lineCount && indentedRE.test(cm.getLine(lineNum + probeLine))) {
            probeLine++
          }

          // Check if end of file or block appended by empty line, making it a legal code block
          if (lineNum + probeLine === lineCount || blankishRE.test(cm.getLine(lineNum + probeLine))) {
            codeBlockLines.push(...range(lineNum, lineNum + probeLine))
            // Skip ahead until after code block
            lineNum += probeLine - 1
          }
        }
      }
    }

    // Finally, after skipping all the code, remove leftover classes
    cm.removeLineClass(lineNum, 'wrap', codeblockClass, codeblockClassOpen, codeblockClassClose)
  }

  // Apply code classes to code blocks
  codeBlockLines.forEach(function (lineNum, index, lines) {
    cm.addLineClass(lineNum, 'wrap', codeblockClass)

    // if previous line is not code
    if (lines[index - 1] !== lineNum - 1) {
      cm.addLineClass(lineNum, 'wrap', codeblockClassOpen)

      // If this was caused by backspacing the first line of indented code, we
      // need to explicitly clean up the classes
      if (index >= 0) {
        cm.removeLineClass(lineNum - 1, 'wrap', codeblockClass, codeblockClassOpen)
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
        cm.removeLineClass(lineNum + 1, 'wrap', codeblockClass, codeblockClassClose)
      }
    } else {
      cm.removeLineClass(lineNum, 'wrap', codeblockClassClose)
    }

    // If last line is code, make sure to close the class
    if (lineNum === lineCount - 1) {
      cm.addLineClass(lineNum, 'wrap', codeblockClass, codeblockClassClose)
    }
  })
}
