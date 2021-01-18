/**
 * Hooks onto the cursorActivity event to apply heading classes
 *
 * @param   {CodeMirror}  cm  The instance
 */
module.exports = (cm) => {
  // DEBUG TESTING

  // While taskHandle is undefined, there's no task scheduled. Else, there is.
  let taskHandle

  const callback = function (cm) {
    if (taskHandle !== undefined) {
      return // There's already a task scheduled
    }

    taskHandle = requestIdleCallback(function () {
      applyHeadingClasses(cm)
      taskHandle = undefined // Reset task handle
    }, { timeout: 1000 }) // Execute after 1 seconds, even if there's a performance penalty involved
  }

  cm.on('cursorActivity', callback)
  cm.on('viewportChange', callback)
  cm.on('optionChange', callback)
}

function applyHeadingClasses (cm) {
  // We'll only render the viewport
  const viewport = cm.getViewport()
  for (let i = viewport.from; i < viewport.to; i++) {
    const line = cm.getLine(i)

    const headerClass = retrieveHeaderClass(cm, i)

    // Only re-apply a header class if allowed.
    if (cm.getModeAt({ 'line': i, 'ch': 0 }).name !== 'markdown') {
      if (headerClass > 0) {
        removeHeaderClass(cm, i, headerClass)
      }
      continue
    }

    // Then re-add the header classes as appropriate.
    let match = /^(#{1,6}) /.exec(line)
    if (match) {
      maybeUpdateHeaderClass(cm, i, match[1].length)
      continue // Finished
    } else if (headerClass > 0) {
      removeHeaderClass(cm, i, headerClass)
      continue
    }

    if (i === 0) {
      continue // No need to check for Setext header
    }

    // Check for Setext headers. According to the CommonMark
    // spec: At most 3 preceeding spaces, no internal spaces
    match = /^[ ]{0,3}[=]+[ ]*$|^[ ]{0,3}[-]+[ ]*$/.exec(line)
    if (match) {
      // We got a match, so first determine its level
      let level = (match[0].indexOf('=') > -1) ? 1 : 2
      // Now determine the span of the heading, because
      // the heading can span an arbitrary number (but
      // not contain a blank line, obviously)
      let begin = i - 1
      for (let fullStop = 0; begin >= 0; begin--, fullStop++) {
        if (fullStop === 10) {
          // We won't deal with Setext headers longer than 10 lines.
          // Abort rendering.
          begin = i
          break
        }
        // First empty line stops the heading. Also, check for
        // lists, because strictly speaking, this might also
        // return truthy for a Setext heading. Also, we need to
        // check for code block endings (backticks)
        let beginningLine = cm.getLine(begin)
        if (/^\s*$/.test(beginningLine) || /^\s*-\s+|^\s{0,3}`{3,}/.test(beginningLine)) {
          begin++
          break
        }
      }

      if (begin === i) {
        continue // False alarm
      }

      // Add the correct line classes to both lines
      for (let line = begin; line <= i; line++) {
        maybeUpdateHeaderClass(cm, line, level)
      }
    }
  }
}

/**
 * Retrieves a heading class if there is one. Returns 0 if no header class was
 * detected.
 *
 * @param   {CodeMirror}  cm    The CodeMirror instance
 * @param   {number}      line  The line number
 *
 * @return  {number}            The header class, between 1 and 6, or 0 if no class was found.
 */
function retrieveHeaderClass (cm, line) {
  const lineInfo = cm.doc.lineInfo(line)
  const match = /size-header-([1-6])/.exec(lineInfo.wrapClass)

  if (match !== null) {
    return parseInt(match[1], 10)
  } else {
    return 0
  }
}

/**
 * Removes the given header class from the line
 *
 * @param   {CodeMirror}  cm           The CodeMirror instance
 * @param   {number}      line         The affected line
 * @param   {number}      classNumber  The class to remove
 */
function removeHeaderClass (cm, line, classNumber) {
  cm.doc.removeLineClass(line, 'wrap', `size-header-${classNumber}`)
}

/**
 * Updates the line class to newClass if applicable
 *
 * @param   {CodeMirror}  cm        The CodeMirror instance
 * @param   {number}      line      The line
 * @param   {number}      newClass  The new class 1-6 to be applied
 */
function maybeUpdateHeaderClass (cm, line, newClass) {
  const headerClass = retrieveHeaderClass(cm, line)
  if (headerClass !== newClass) {
    if (headerClass > 0) {
      removeHeaderClass(cm, line, headerClass)
    }
    cm.doc.addLineClass(line, 'wrap', `size-header-${newClass}`)
  }
}
