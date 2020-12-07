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
  // cm.on('optionChange', applyHeadingClasses) // DEBUG
}

function applyHeadingClasses (cm) {
  let wrapperClass = ''
  let needsRefresh = false // Will be set to true if at least one line has been altered

  // We'll only render the viewport
  const viewport = cm.getViewport()
  for (let i = viewport.from; i < viewport.to; i++) {
    let oldClass = ''
    const line = cm.getLine(i)

    // Retrieve the wrapper class
    wrapperClass = cm.lineInfo(i).wrapClass

    // Save the old class name
    if (/size-header-\d/.test(wrapperClass)) {
      oldClass = /(size-header-\d)/.exec(wrapperClass)[1]
    }

    // Then remove all header styles
    for (let x = 1; x < 7; x++) {
      cm.removeLineClass(i, 'wrap', `size-header-${x}`)
    }

    // Only re-apply a header class if allowed.
    if (cm.getModeAt({ 'line': i, 'ch': 0 }).name !== 'markdown') {
      // Indicate a refresh if necessary
      if (oldClass !== '') needsRefresh = true
      continue
    }

    // Then re-add the header classes as appropriate.
    let match = /^(#{1,6}) /.exec(line)
    if (match) {
      cm.addLineClass(i, 'wrap', `size-header-${match[1].length}`)
      // If the new header class is different
      // than the old one, indicate a refresh.
      if (oldClass !== `size-header-${match[1].length}`) needsRefresh = true
    }

    if (i === 0) continue // No need to check for Setext header

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
        cm.addLineClass(line, 'wrap', `size-header-${level}`)
      }

      // If the new header class is different
      // than the old one, indicate a refresh.
      if (oldClass !== `size-header-${level}`) {
        needsRefresh = true
      }
    }
  }

  // If at least one header class has been altered, refresh the codemirror
  // instance as the sizes won't match up in that case.
  if (needsRefresh) {
  //   cm.refresh()
  }
}
