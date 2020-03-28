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
  var tableHeadingRE = /(^[- ]+$)|(^[- +:]+$)|(^[- |:+]+$)/

  CodeMirror.commands.markdownInsertTable = function (cm) {
    // A small command that inserts a 2x2 table at the current cursor position.
    cm.replaceSelection('| | |\n| | |\n')
  }

  CodeMirror.commands.markdownRenderTables = function (cm) {
    // First remove tables that don't exist anymore.
    let i = 0
    do {
      if (tableMarkers[i] && tableMarkers[i].find() === undefined) {
        // Marker is no longer present, so splice it
        tableMarkers.splice(i, 1)
        tables.splice(i, 1) // Remove the corresponding table
      } else {
        i++
      }
    } while (i < tableMarkers.length)

    // Now render all potential new links. We only check one line less
    // because such a table header WILL NEVER be on the last line, plus
    // this way we can check for Setext headers without having to worry.
    for (let i = 1; i < cm.lineCount() - 1; i++) {
      if (cm.getModeAt({ 'line': i, 'ch': 0 }).name !== 'markdown-zkn') continue

      // First get the line and test if the contents resemble a table. We only
      // search for the heading rows here, because these are the only ones that
      // indicate a table. (Which is why none other than the really explicit
      // tables have syntax highlighting -- CodeMirror modes cannot do that).
      let firstLine // First line of a given table
      let lastLine // Last line of a given table
      let potentialTableType // Stores the potential type, can be "pipe", "simple"
      let line = cm.getLine(i)
      let match = tableHeadingRE.exec(line)
      if (match == null) continue // No table heading

      if (match[1]) {
        // Group 1 triggered, so we might have a simple table.
        if (cm.getLine(i + 1).trim() === '') continue // It's a Setext heading
        if (i === 0 || cm.getLine(i - 1).trim() === '') {
          // We have a headless table, so let's search the end.
          firstLine = i // First line in this case is i
          for (let j = i + 1; j < cm.lineCount(); j++) {
            let l = cm.getLine(j)
            if (l.trim() === '') break // Leave without setting lastLine
            let m = tableHeadingRE.exec(l)
            if (m != null && m[1]) {
              lastLine = j
              break
            }
          }
        } else {
          // We do not have a headless table
          firstLine = i - 1
          for (let j = i; j < cm.lineCount(); j++) {
            if (cm.getLine(j).trim() === '') {
              // First empty line marks the end of the table.
              lastLine = j - 1
              break
            }
          }
        }

        potentialTableType = 'simple'
      } else if (match[2]) {
        // Group 2 triggered, so we maybe got a grid table. Grid tables may be
        // headerless or have a header. But the very first line will always
        // match the group, so we only have to look downward! As for pipe
        // tables, the first empty line marks the end of the table.
        // N.B.: We have this order of capturing groups because group 3 will
        // also match grid tables!
        firstLine = i
        for (let j = i + 1; j < cm.lineCount(); j++) {
          if (cm.getLine(j).trim() === '') {
            lastLine = j - 1
            break
          }
        }

        potentialTableType = 'grid'
      } else if (match[3]) {
        // Group 3 triggered, so we might have a pipe table. A pipe table must
        // have a header, which means we'll have an easy time determining the
        // table boundaries.
        if (i === 0 || cm.getLine(i - 1).trim() === '') continue // Nope
        firstLine = i - 1
        for (let j = i; j < cm.lineCount(); j++) {
          if (cm.getLine(j).trim() === '') {
            lastLine = j - 1
            break
          }
        }

        potentialTableType = 'pipe'
      }

      // Something went wrong
      if (lastLine === undefined || firstLine === undefined) continue
      if (firstLine === lastLine) continue

      // We've got ourselves a table! firstLine and lastLine now demarcate the
      // lines from and to which it goes. But before we continue with the table,
      // we need to set i to lastLine, because otherwise the renderer will
      // produce sometimes even overlapping tables, especially with simple ones.
      i = lastLine

      // First check if the user is not inside that table
      let cur = cm.getCursor('from')
      if (cur.line >= firstLine && cur.line <= lastLine) continue

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
      if (con) continue // Skip

      // First grab the full table
      let markdownTable = ''
      for (let i = firstLine; i <= lastLine; i++) {
        markdownTable += cm.getLine(i) + '\n'
      }

      // Now attempt to create a table from it.
      let tbl
      let textMarker
      tbl = new Table(0, 0, {
        // Detect mouse movement on the scroll element (so that
        // scroll detection in the helper works as expected)
        'container': '#editor .CodeMirror .CodeMirror-scroll',
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
          // If there's still the textmarker, remove it by force to re-render
          // the table immediately.
          if (textMarker) textMarker.clear()
          // Splice the table and corresponding marker from the arrays
          if (found) tables.splice(found, 1)
          // Also splice it to retain synchronous arrays
          if (found) tableMarkers.splice(found, 1)
        }
      }) // END constructor
      try {
        // Will raise an error if the table is malformed
        tbl.fromMarkdown(markdownTable, potentialTableType)
      } catch (err) {
        console.error(`Could not instantiate table between ${firstLine} and ${lastLine}: ${err.message}`)
        // Error, so abort rendering.
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
