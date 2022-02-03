/**
  * @ignore
  * BEGIN HEADER
  *
  * Contains:        Footnotes CodeMirror Plugin
  * CVM-Role:        CodeMirror Plugin
  * Maintainer:      Hendrik Erz
  * License:         GNU GPL v3
  *
  * Description:     Enables shortcuts for inserting and removing footnotes.
  *
  * END HEADER
  */

import CodeMirror, { commands, Pass } from 'codemirror'
import { getFnRE, getFnRefRE } from '@common/regular-expressions'
const fnRE = getFnRE()
const fnrefRE = getFnRefRE(true) // Get the multiline version

/**
 * Inserts a footnote
 *
 * @param   {CodeMirror.Editor}  cm  The editor instance
 */
;(commands as any).insertFootnote = function (cm: CodeMirror.Editor) {
  // This is done by parseInt()-ing the existing footnotes and search for the
  // highest identifier. So this function does not include special footnote refs
  // (such as [^a-footnote-ref]). But still it definitely yields unique footnotes.
  if (cm.isReadOnly()) {
    return Pass
  }

  // Reset search indices
  fnRE.lastIndex = 0
  fnrefRE.lastIndex = 0

  let cur = cm.getCursor()

  if (fnrefRE.test(cm.getLine(cur.line))) {
    // Let's try to keep inception with fns inside other fns to a minimum.
    return Pass
  }

  let content = cm.getValue()

  // Find all footnotes
  let lastIndex = 0 // Start with 0 because the index WILL be increased.
  let match

  while ((match = fnRE.exec(content)) !== null) {
    // Find the highest index
    let fn = match[2] ?? match[3]
    if (parseInt(fn) > lastIndex) {
      lastIndex = parseInt(fn)
    }
  }

  // lastIndex is now one bigger than the last found actual (number) index
  // but at least 1.
  lastIndex++

  // First insert the footnote anchor.
  cm.replaceRange(`[^${lastIndex}]`, cur)
  // Then add a reference to the bottom of the document
  if (cm.getLine(cm.lastLine()).trim() === '') {
    // If the last line is empty, simply put the ref in it.
    cm.replaceRange(`[^${lastIndex}]: `, { 'line': cm.lastLine(), 'ch': cm.getLine(cm.lastLine()).length })
  } else if (fnrefRE.test(cm.getLine(cm.lastLine()))) {
    // Last line is a footnote reference -> Only add one newline.
    cm.replaceRange(`\n[^${lastIndex}]: `, { 'line': cm.lastLine(), 'ch': cm.getLine(cm.lastLine()).length })
  } else {
    // Line is neither empty nor a footnote reference.
    cm.replaceRange(`\n\n[^${lastIndex}]: `, { 'line': cm.lastLine(), 'ch': cm.getLine(cm.lastLine()).length })
  }
}

/**
 * Removes a footnote. It searches for a footnote under the cursor and removes
 * this as well as a (potentially found) reference to that.
 *
 * @param   {CodeMirror.Editor}  cm  The codemirror instance
 */
;(commands as any).removeFootnote = function (cm: CodeMirror.Editor) {
  if (cm.isReadOnly()) {
    return Pass
  }

  // Reset search indices
  fnRE.lastIndex = 0
  fnrefRE.lastIndex = 0

  let curTo = cm.getCursor()

  // Initialize a head for the selection
  let curFrom = { 'line': curTo.line, 'ch': curTo.ch }
  // If your footnote identifier length exceeds this, you're mad and don't
  // deserve better. Delete this mess by yourself!
  let emergencyStop = 30

  // Step one: Find the beginning
  do {
    curFrom.ch = curFrom.ch - 1
    cm.setSelection(curFrom, curTo)
    if (--emergencyStop < 0) {
      // Prevent infinite loop
      break
    }
    // Do as long as inside the selection there is no opening bracket.
  } while (cm.getSelection().indexOf('[') !== 0)

  emergencyStop = 30
  let match = null
  // Now we either have nothing because the loop stopped or the beginning.
  do {
    // Always start from the beginning of the string.
    fnRE.lastIndex = 0

    curTo.ch = curTo.ch + 1
    cm.setSelection(curFrom, curTo)
    if (--emergencyStop < 0) {
      // Prevent infinite loop
      break
    }
    // Do as long as we don't recognize the pattern '[^<ref>]'
    // This now should also match strings the end with the closing bracket
  } while ((match = fnRE.exec(cm.getSelection())) === null)

  // At this position it may be that the selection also includes exactly
  // 30 chars BEFORE the actual footnote. This may be because the user
  // placed the cursor directly before the opening bracket ([). In this
  // case the removal will indeed succeed because of our use of RegEx.
  // There is only one problem: If there are 30 chars before the note
  // selected they will also be removed. So we need to re-check that
  // the selection actually ONLY includes the footnote itself and the
  // curFrom is set accordingly.
  //
  // We can be sure of the following:
  // 1. The match includes the precise footnote that has been matched.
  // 2. The END of the selection is definitely correctly set.
  if (match !== null && match.input.indexOf('[') > 0) {
    // > 0 indicates there's something selected before the footnote
    // Simply push forward the curFrom.ch to that index and re-select.
    curFrom.ch = curFrom.ch + match.input.indexOf('[')
    cm.setSelection(curFrom, curTo)
  }

  // Either we got the complete footnote or again an error.
  if (match !== null) {
    // Okay, we've got a footnote selected.
    // The identifier is either in 2 (if there has been a character after
    // the footnote in the selection) or in 3 (if the selection exactly
    // encompasses the footnote)
    let fn = match[2] ?? match[3]

    // Now from the end of the document try to find the respective
    // reference and remove the whole line.
    for (let lineNo = cm.lastLine(); lineNo > -1; lineNo--) {
      // Again reset the search begin
      fnrefRE.lastIndex = 0
      let line = cm.getLine(lineNo)

      let match = fnrefRE.exec(line)
      if (match !== null && (match[1] === fn)) {
        // Replace the whole line -> selection to beginning of next
        // line. CM will automatically clip to safe defaults
        cm.addSelection({
          'line': lineNo,
          'ch': 0
        }, {
          'line': lineNo + 1,
          'ch': 0
        })
        // We are done here.
        break
      }
    }

    // Remove the footnote and its reference in one step (to only account
    // for one single CodeMirror history event)
    cm.replaceSelections([ '', '' ])

    // Reset the cursor to the initial beginning
    cm.setCursor(curFrom)
  }
  // We did not find any footnote under the cursor :(
}
