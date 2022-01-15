/**
  * @ignore
  * BEGIN HEADER
  *
  * Contains:        Task rendering Plugin
  * CVM-Role:        CodeMirror Plugin
  * Maintainer:      Hendrik Erz
  * License:         GNU GPL v3
  *
  * Description:     This plugin renders task items and makes them checkable.
  *
  * END HEADER
  */

import CodeMirror, { commands } from 'codemirror'
import { getTaskRE } from '@common/regular-expressions'

const taskRE = getTaskRE() // Matches `- [ ]` and `- [x]`

/**
 * Renders task list items
 *
 * @param   {CodeMirror.Editor}  cm  The CodeMirror instance
 */
;(commands as any).markdownRenderTasks = function (cm: CodeMirror.Editor) {
  let match

  // We'll only render the viewport
  const viewport = cm.getViewport()
  for (let i = viewport.from; i <= viewport.to; i++) {
    if (cm.getModeAt({ line: i, ch: 0 }).name !== 'markdown-zkn') continue
    // Always reset lastIndex property, because test()-ing on regular
    // expressions advances it.
    taskRE.lastIndex = 0

    // First get the line and test if the contents contain a link
    const line = cm.getLine(i)
    if ((match = taskRE.exec(line)) == null) {
      continue
    }

    const leadingSpaces = match[1].length ?? 0

    if (cm.getCursor('from').line === i && cm.getCursor('from').ch < 5 + leadingSpaces) {
      // We're directly in the formatting so don't render.
      continue
    }

    const curFrom = { line: i, ch: 0 + leadingSpaces }
    const curTo = { line: i, ch: 5 + leadingSpaces }

    // We can only have one marker at any given position at any given time
    if (cm.findMarks(curFrom, curTo).length > 0) {
      continue
    }

    // Now we can render it finally.
    const checked = (match[3] === 'x')
    const listSign = match[2] // Save the sign +, -, or * for later

    const cbox = document.createElement('input')
    cbox.type = 'checkbox'
    if (checked) {
      cbox.checked = true
    }

    // If the CodeMirror instance is readOnly, disable the checkbox
    cbox.disabled = cm.isReadOnly()

    let textMarker = cm.markText(
      curFrom, curTo,
      {
        'clearOnEnter': true,
        'replacedWith': cbox,
        'inclusiveLeft': false,
        'inclusiveRight': false
      }
    )

    // Clear the textmarker once it's hidden b/c we'd rather
    // re-render than having a wrong state associated with the marker
    textMarker.on('hide', () => { textMarker.clear() })

    cbox.onclick = (e) => {
      const markerPosition = textMarker.find()
      if (cm.isReadOnly() || markerPosition === undefined) {
        return // Don't do anything
      }

      const { from, to } = markerPosition

      // Check or uncheck it (NOTE that cbox will already represent the NEW state)
      const newMark = (cbox.checked) ? 'x' : ' '
      cm.replaceRange(`${listSign} [${newMark}]`, from, to)

      // ReplaceRange removes the marker, so we have to re-initiate it
      textMarker = cm.markText(
        from, to,
        {
          'clearOnEnter': true,
          'replacedWith': cbox,
          'inclusiveLeft': false,
          'inclusiveRight': false
        }
      )
    } // END onclick

    // We need to listen to readOnly state changes to enable/disable checkboxes
    const updateHandler = (cm: CodeMirror.Editor, option: any): void => {
      if (!document.body.contains(cbox)) {
        // Remove the event listener again
        cm.off('optionChange', updateHandler)
      }

      cbox.disabled = cm.isReadOnly()
    }

    // Listen to option changes
    cm.on('optionChange', updateHandler)
  }
}
