/* global define CodeMirror */
// This plugin renders markdown tables for easy editability

const Table = require('../../util/table-helper.js');

(function (mod) {
  if (typeof exports === 'object' && typeof module === 'object') { // CommonJS
    mod(require('../../../node_modules/codemirror/lib/codemirror'))
  } else if (typeof define === 'function' && define.amd) { // AMD
    define(['../../../node_modules/codemirror/lib/codemirror'], mod)
  } else { // Plain browser env
    mod(CodeMirror)
  }
})(function (CodeMirror) {
  'use strict'

  var tableMarkers = []
  var tables = []
  var tableRE = /^\|.+\|$/

  CodeMirror.commands.markdownInsertTable = function (cm) {
    // A small command that inserts a 2x2 table at the current cursor position.
    cm.replaceSelection('| | |\n| | |\n')
  }

  CodeMirror.commands.markdownRenderTables = function (cm) {
    let i = 0
    let firstLine // First line of a given table
    let lastLine // Last line of a given table

    // First remove tables that don't exist anymore.
    do {
      if (!tableMarkers[i]) {
        continue
      }
      if (tableMarkers[i] && tableMarkers[i].find() === undefined) {
        // Marker is no longer present, so splice it
        tableMarkers.splice(i, 1)
        tables.splice(i, 1) // Remove the corresponding table
      } else {
        i++
      }
    } while (i < tableMarkers.length)

    // Now render all potential new links
    for (let i = 0; i < cm.lineCount(); i++) {
      if (cm.getModeAt({ 'line': i, 'ch': 0 }).name !== 'markdown') continue

      // First get the line and test if the contents resemble a table
      let line = cm.getLine(i)
      if (tableRE.test(line)) {
        if (!firstLine) {
          firstLine = lastLine = i
          continue // Next line
        }

        lastLine = i
        continue
      } else {
        // First non-table line, let's check if we already have one. If there's
        // none, jump over this line
        if (!firstLine && !lastLine) continue
      }

      // We've got ourselves a table! firstLine and lastLine now demarcate the
      // lines from and to which they go
      // First check if the user is not inside that table
      let cur = cm.getCursor('from')
      if (cur.line >= firstLine && cur.line <= lastLine) {
        // Cursor is in selection: Do not render. Additionally,
        // we must reset firstLine and lastLine to not mess up
        // with the renderer.
        firstLine = lastLine = undefined
        continue
      }

      let curFrom = { 'line': firstLine, 'ch': 0 }
      let curTo = { 'line': lastLine, 'ch': cm.getLine(lastLine).length }

      // Has this thing already been rendered?
      let con = false
      let marks = cm.findMarks(curFrom, curTo)
      for (let marx of marks) {
        if (tableMarkers.includes(marx)) {
          // We've got communism. (Sorry for the REALLY bad pun.)
          con = true
          break
        }
      }
      if (con) {
        firstLine = lastLine = undefined
        continue // Skip this match
      }

      // First grab the full table
      let markdownTable = ''
      for (let i = firstLine; i <= lastLine; i++) {
        markdownTable += cm.getLine(i) + `\n`
      }

      // Now attempt to create a table from it.
      let tbl
      let textMarker
      tbl = new Table(0, 0, {
        'onBlur': (t) => {
          // Don't replace some arbitrary text somewhere in the document!
          if (!textMarker || !textMarker.find()) return

          let found = tables.find(elem => elem === t)
          let md = t.getMarkdownTable()
          // The markdown table has a trailing newline, which we need to
          // remove at all costs.
          md = md.substr(0, md.length - 1)

          // We'll simply replace the range with the new table. The plugin will
          // be called to re-render the table once again.
          let { from, to } = textMarker.find()
          cm.replaceRange(md.split('\n'), from, to)
          // Replace the table-node to not re-render it again.
          t.getDOMElement().remove()
          // Splice the table and corresponding marker from the arrays
          if (found) tables.splice(found, 1)
          // Also splice it to retain synchronous arrays
          if (found) tableMarkers.splice(found, 1)
          // If there's still the textmarker, remove it by force to re-render
          // the table immediately.
          if (textMarker) textMarker.clear()
        }
      }) // END constructor
      try {
        // Will raise an error if the table is malformed
        tbl.fromMarkdown(markdownTable)
      } catch (err) {
        console.log(`Could not instantiate table between ${firstLine} and ${lastLine}: ${err.message}`)
        // Error, so abort rendering.
        firstLine = lastLine = undefined
        continue
      }

      // At this point, we have a fully rendered table and can insert it into
      // the DOM.

      // Apply TextMarker
      textMarker = cm.markText(
        curFrom, curTo,
        {
          'clearOnEnter': false,
          'replacedWith': tbl.getDOMElement(),
          'inclusiveLeft': false,
          'inclusiveRight': false
        }
      )

      tableMarkers.push(textMarker)
      tables.push(tbl)
      firstLine = lastLine = undefined // Reset first and last line
    }
  }

  CodeMirror.commands.markdownInitiateTables = function (cm) {
    // This function is called to initate the tables that have
    // actually been rendered.
    for (let table of tables) {
      if (document.getElementById(table.getTableID())) {
        table.initiate()
      }
    }
  }
})
