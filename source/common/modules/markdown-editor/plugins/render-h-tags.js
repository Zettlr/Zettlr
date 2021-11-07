/* global CodeMirror define */
/**
  * @ignore
  * BEGIN HEADER
  *
  * Contains:        Heading tags Plugin
  * CVM-Role:        CodeMirror Plugin
  * Maintainer:      Hendrik Erz
  * License:         GNU GPL v3
  *
  * Description:     This plugin renders Bear-style heading indicators.
  *
  * END HEADER
  */

const { getHeadRE } = require('../../../regular-expressions');

(function (mod) {
  if (typeof exports === 'object' && typeof module === 'object') { // CommonJS
    mod(require('codemirror/lib/codemirror'))
  } else if (typeof define === 'function' && define.amd) { // AMD
    define(['codemirror/lib/codemirror'], mod)
  } else { // Plain browser env
    mod(CodeMirror)
  }
})(function (CodeMirror) {
  'use strict'

  const headRE = getHeadRE()

  let currentCallback = null

  CodeMirror.commands.markdownRenderHTags = function (cm) {
    let match

    // We'll only render the viewport
    const viewport = cm.getViewport()
    for (let i = viewport.from; i < viewport.to; i++) {
      if (cm.getModeAt({ 'line': i, 'ch': 0 }).name !== 'markdown-zkn') continue
      // Always reset lastIndex property, because test()-ing on regular
      // expressions advances it.
      headRE.lastIndex = 0

      // First get the line and test if the contents contain a link
      let line = cm.getLine(i)
      if ((match = headRE.exec(line)) == null) {
        continue
      }

      const headingLevel = match[1].length

      let curFrom = cm.getCursor('from')
      const curTo = { 'line': i, 'ch': headingLevel }

      if (curFrom.line === i && curFrom.ch < headingLevel && curFrom.ch > 0) {
        // We're directly in the formatting so don't render.
        continue
      }

      curFrom = { 'line': i, 'ch': 0 }

      // We can only have one marker at any given position at any given time
      if (cm.doc.findMarks(curFrom, curTo).length > 0) {
        continue
      }

      const hTagWrapper = document.createElement('div')
      hTagWrapper.className = 'heading-tag'

      const hTag = document.createElement('span')
      hTag.textContent = 'h' + headingLevel
      hTagWrapper.appendChild(hTag)

      const textMarker = cm.doc.markText(
        curFrom, curTo,
        {
          'clearOnEnter': true,
          'replacedWith': hTagWrapper,
          'inclusiveLeft': false,
          'inclusiveRight': false
        }
      )

      // Display a small menu to change the heading level on click
      hTagWrapper.onclick = (e) => {
        // Prevent bubbling because otherwise the context menu will be hidden
        // again immediately due to the event bubbling upwards to the window.
        e.stopPropagation()

        // If we have a callback saved, there is a menu still displayed. It may
        // be that the callback is still there but no menu is shown, but then
        // calling it is a no-op
        if (currentCallback !== null) {
          currentCallback()
        }

        const items = [
          {
            id: '1',
            label: '#',
            type: 'checkbox',
            enabled: cm.isReadOnly() === false,
            checked: headingLevel === 1
          },
          {
            id: '2',
            label: '##',
            type: 'checkbox',
            enabled: cm.isReadOnly() === false,
            checked: headingLevel === 2
          },
          {
            id: '3',
            label: '###',
            type: 'checkbox',
            enabled: cm.isReadOnly() === false,
            checked: headingLevel === 3
          },
          {
            id: '4',
            label: '####',
            type: 'checkbox',
            enabled: cm.isReadOnly() === false,
            checked: headingLevel === 4
          },
          {
            id: '5',
            label: '#####',
            type: 'checkbox',
            enabled: cm.isReadOnly() === false,
            checked: headingLevel === 5
          },
          {
            id: '6',
            label: '######',
            type: 'checkbox',
            enabled: cm.isReadOnly() === false,
            checked: headingLevel === 6
          }
        ]

        const point = { x: e.clientX, y: e.clientY }
        currentCallback = global.menuProvider.show(point, items, (id) => {
          const newLevel = parseInt(id, 10)

          // The heading might have changed position in the meantime
          const { from, to } = textMarker.find()
          cm.replaceRange('#'.repeat(newLevel), from, to)
          textMarker.clear()
          currentCallback = null // No need to save it anymore
          // Programmatically trigger a cursor movement ...
          cm.setCursor({ line: from.line, ch: newLevel + 1 })
          // ... and re-focus the editor
          cm.focus()
        })
      }
    }
  }
})
