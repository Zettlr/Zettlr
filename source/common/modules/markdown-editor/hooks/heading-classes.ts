/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        CodeMirror heading classes hook
 * CVM-Role:        CodeMirror plugin
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Adds heading line classes where appropriate.
 *
 * END HEADER
 */

import CodeMirror from 'codemirror'

/**
 * Hooks onto the cursorActivity event to apply heading classes
 *
 * @param   {CodeMirror.Editor}  cm  The instance
 */
export default function headingClassHook (cm: CodeMirror.Editor): void {
  // While taskHandle is undefined, there's no task scheduled. Else, there is.
  let taskHandle: number|undefined

  const callback = function (cm: CodeMirror.Editor): void {
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

function applyHeadingClasses (cm: CodeMirror.Editor): void {
  // We'll only render the viewport
  const viewport = cm.getViewport()
  const discardClasses = []

  for (let i = viewport.from; i < viewport.to; i++) {
    const line = cm.getLine(i)

    const headerClass = retrieveHeaderClass(cm, i)

    // Only re-apply a header class if allowed.
    if (cm.getModeAt({ 'line': i, 'ch': 0 }).name !== 'markdown-zkn') {
      if (headerClass > 0) {
        removeHeaderClass(cm, i, headerClass)
      }
      continue
    }

    // Then re-add the header classes as appropriate.
    let match = /^(#{1,6}) /.exec(line)
    if (match !== null) {
      maybeUpdateHeaderClass(cm, i, match[1].length)
      continue // Finished
    } else if (headerClass > 0) {
      // Mark this line for removal. Will be removed after we've checked for
      // Setext headings, but the Setext detection will remove those lines from
      // here which are valid Setext headings.
      discardClasses.push([ i, headerClass ])
    }

    if (i === 0) {
      continue // No need to check for Setext header
    }

    // Check for Setext headers. According to the CommonMark
    // spec: At most 3 preceeding spaces, no internal spaces
    match = /^\s{0,3}[=-]+\s*$/.exec(line)
    if (match !== null && i > 0) {
      // We got a match, so first determine its level
      const level = (match[0].includes('=')) ? 1 : 2
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

        // If anything within the heading can be interpreted as code, a block
        // quote, an ATX heading or something else that is not a paragraph, the
        // Setext rendering must be aborted.
        let beginningLine = cm.getLine(begin)
        if (/^\s*[-+>]\s+|^\s{0,3}[`=-]{3,}|^#+/.test(beginningLine)) {
          begin = i
          break
        }

        // First empty line stops the heading.
        if (/^\s*$/.test(beginningLine)) {
          begin++
          break
        }
      }

      if (begin === i) {
        continue // False alarm
      }

      // Add the correct line classes to all lines that belong to this heading
      for (let line = begin; line <= i; line++) {
        // At this point, we must remove all lines from the discard array that
        // are part of this Setext heading and thus should not have any class
        // removed
        const found = discardClasses.find(elem => elem[0] === line)
        if (found !== undefined) {
          discardClasses.splice(discardClasses.indexOf(found), 1)
        }

        maybeUpdateHeaderClass(cm, line, level)
      }
    }
  } // END for

  // Clean up by removing detected header classes from
  // every line that is not a valid heading anymore.
  for (const line of discardClasses) {
    removeHeaderClass(cm, line[0], line[1])
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
function retrieveHeaderClass (cm: CodeMirror.Editor, line: number): number {
  const lineInfo = cm.lineInfo(line)
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
function removeHeaderClass (cm: CodeMirror.Editor, line: number, classNumber: number): void {
  if (classNumber === 0) {
    return
  }

  cm.removeLineClass(line, 'wrap', `size-header-${classNumber}`)
}

/**
 * Updates the line class to newClass if applicable
 *
 * @param   {CodeMirror}  cm        The CodeMirror instance
 * @param   {number}      line      The line
 * @param   {number}      newClass  The new class 1-6 to be applied
 */
function maybeUpdateHeaderClass (cm: CodeMirror.Editor, line: number, newClass: number): void {
  if (line < 0 || line > cm.lineCount()) {
    return
  }

  const headerClass = retrieveHeaderClass(cm, line)
  if (headerClass !== newClass) {
    removeHeaderClass(cm, line, headerClass)
    cm.addLineClass(line, 'wrap', `size-header-${newClass}`)
  }
}
