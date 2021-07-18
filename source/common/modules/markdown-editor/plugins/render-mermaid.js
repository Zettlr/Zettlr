/* global define CodeMirror */
/**
  * @ignore
  * BEGIN HEADER
  *
  * Contains:        Mermaid rendering Plugin
  * CVM-Role:        CodeMirror Plugin
  * Maintainer:      Hendrik Erz
  * License:         GNU GPL v3
  *
  * Description:     This plugin renders Mermaid diagrams.
  *
  * END HEADER
  */

const mermaid = require('mermaid')

;(function (mod) {
  if (typeof exports === 'object' && typeof module === 'object') { // CommonJS
    mod(require('codemirror/lib/codemirror'))
  } else if (typeof define === 'function' && define.amd) { // AMD
    define(['codemirror/lib/codemirror'], mod)
  } else { // Plain browser env
    mod(CodeMirror)
  }
})(function (CodeMirror) {
  'use strict'

  // Initialise the mermaid API
  // We could get the CSS variables like this, but CSS is loaded _after_ this
  // code snippet, so the property will just return an empty string
  // let mermaid_bg0   = getComputedStyle(document.documentElement).getPropertyValue('--grey-0')
  let mermaid_bg0   = 'rgba(240, 240, 240, 1)' // grey 0
  let mermaid_bg1   = 'rgba(220, 220, 220, 1)' // grey 1
  let mermaid_lines = 'rgba(100, 100, 110, 1)' // grey 4
  let mermaid_text  = 'rgba(100, 100, 110, 1)' // grey 4
  let mermaid_pop   = 'rgba( 28, 178, 126, 1)' // primary
  let mermaid_pop_shade   = 'rgba(  4, 125, 101, 1)' // primary shade
  let mermaid_pie1  = 'rgba( 28, 178, 126, 1)' // green 0
  let mermaid_pie2  = 'rgba(  4, 125, 101, 1)' // green 1
  let mermaid_pie3  = 'rgba( 40,  80,  40, 1)' // green 2
  let mermaid_pie4  = 'rgba( 29, 117, 179, 1)' // blue 0
  let mermaid_pie5  = 'rgba( 37,  53, 146, 1)' // blue 1
  let mermaid_pie6  = 'rgba( 70,  90, 120, 1)' // blue 2
  let mermaid_pie7  = 'rgba(255, 180, 108, 1)' // orange 0
  let mermaid_pie8  = 'rgba(255, 124,  69, 1)' // orange 1
  let mermaid_pie9  = 'rgba(240,  87,  52, 1)' // orange 2
  let mermaid_pie10 = 'rgba(240,  50,  50, 1)' // red 0
  let mermaid_pie11 = 'rgba(180,  35,  35, 1)' // red 3
  let mermaid_pie12 = 'rgba(100,  20,  20, 1)' // red 6
  let mermaid_font  = 'Segoe UI' // theme font
  mermaid.mermaidAPI.initialize({ startOnLoad: false, theme: 'base',
    themeVariables: {
      // main body is colored to see extend of diagram
      // first-level containers use same background color
      'background'  : mermaid_bg0,
      'primaryColor': mermaid_bg0,
      'secondaryColor': mermaid_bg0,
      'tertiaryColor': mermaid_bg0,
      'mainBkg'     : mermaid_bg0,
      // second-level containers are a shade darker
      // fields in loop
      'noteBkgColor': mermaid_bg1,
      // all borders use the same color
      'primaryBorderColor' : mermaid_lines,
      'secondrayBorderColor' : mermaid_lines,
      'tertiaryBorderColor' : mermaid_lines,
      'noteBorderColor' : mermaid_bg1,
      // lines and highlited elements use theme color
      'lineColor': mermaid_pop,
      // all text to uses the same color
      'fontFamily': mermaid_font,
      'primaryTextColor': mermaid_text,
      'secondaryTextColor': mermaid_text,
      'tertiaryTextColor': mermaid_text,
      'textColor': mermaid_text,
      'noteTextColor': mermaid_text,
      // graph
      'arrowheadColor': mermaid_pop,
      // flowchart
      'clusterBkg'  : mermaid_bg1,
      // sequence chart
      'actorLineColor': mermaid_lines,
      'labelBoxBorderColor': mermaid_lines,
      'signalColor': mermaid_pop,
      'activationBorderColor': mermaid_pop,
      'signalTextColor': mermaid_text,
      // 'loopLine': mermaid_pop,
      // pie chart
      'pie1': mermaid_pie1,
      'pie2': mermaid_pie2,
      'pie3': mermaid_pie3,
      'pie4': mermaid_pie4,
      'pie5': mermaid_pie5,
      'pie6': mermaid_pie6,
      'pie7': mermaid_pie7,
      'pie8': mermaid_pie8,
      'pie9': mermaid_pie9,
      'pie10': mermaid_pie10,
      'pie11': mermaid_pie11,
      'pie12': mermaid_pie12,
      'pieOpacity': '0.8',
      'pieSectionTextColor': mermaid_bg0,
      'pieStrokeColor': mermaid_bg0,
      // class diagram
      // can we increase font-size?
      // can we increase multiplicity font-size?
      // state chart
      // 'compositeBackground': mermaid_bg1,
      // 'compositeTitelBackground': mermaid_bg1,
      'altBackground'   : mermaid_bg1,
      // 'innerEndBackground' : mermaid_pop,
      // user journey diagram
      'fillType0': mermaid_bg0,
      'fillType1': mermaid_bg1,
      'fillType2': mermaid_bg0,
      'fillType3': mermaid_bg1,
      'fillType4': mermaid_bg0,
      'fillType5': mermaid_bg1,
      'fillType6': mermaid_bg0,
      'fillType7': mermaid_bg1,
      // gantt chart
      'altSectionBkgColor': mermaid_lines,
      'gridColor': mermaid_lines,
      'todayLineColor': mermaid_pop,
      'doneTaskBkgColor': mermaid_bg1,
      'doneTaskBorderColor': mermaid_lines,
      'activeTaskBkgColor': mermaid_pop,
      'activeTaskBorderColor': mermaid_pop,
      'taskBkgColor': mermaid_bg0,
      'taskBorderColor': mermaid_lines,
      // 'taskTextDarkColor': mermaid_bg0,
      'critBkgColor': mermaid_bg0,
      'critBorderColor': mermaid_pop,
    }})

  /**
   * Defines the CodeMirror command to render all found markdown images.
   * @param  {CodeMirror} cm The calling CodeMirror instance
   * @return {void}    Commands do not return.
   */
  CodeMirror.commands.markdownRenderMermaid = function (cm) {
    let codeblock = [] // Holds a mermaid code block
    let currentCursorPosition = cm.getCursor('from').line

    // We'll only render the viewport
    const viewport = cm.getViewport()
    for (let i = viewport.from; i < viewport.to; i++) {
      if (cm.getModeAt({ 'line': i, 'ch': 0 }).name !== 'markdown-zkn') continue

      // Cursor is in here, so also don't render (for now)
      if (currentCursorPosition === i) continue

      if (/^```mermaid/.test(cm.getLine(i))) {
        codeblock = [] // Reset codeblock
        let startLine = i
        let endLine = i
        // Now read in all other lines one by one
        let cursorInBlock = false
        let j = i + 1 // Actually begin on the next line to exclude ```mermaid
        for (; j < cm.lineCount(); j++) {
          if (currentCursorPosition === j) {
            cursorInBlock = true
            break
          }
          if (/^```\s*$/.test(cm.getLine(j))) {
            // We're done reading in the codeblock
            endLine = j
            break
          }
          // Add the line to the codeblock
          codeblock.push(cm.getLine(j))
        }

        // Update the outer counter
        i = j++

        if (cursorInBlock) {
          codeblock = [] // Reset codeblock and continue
          continue
        }

        // We've got a codeblock! Let's perform some additional checks
        if (endLine <= startLine) continue

        const curFrom = { 'line': startLine, 'ch': 0 }
        const curTo = { 'line': endLine, 'ch': 3 }
        // We can only have one marker at any given position at any given time
        if (cm.doc.findMarks(curFrom, curTo).length > 0) continue

        // Merge the block together
        let code = codeblock.join('\n')
        let svg = document.createElement('span')
        svg.classList.add('mermaid-chart')
        // we can use a workaround like this to prepend all styling via
        // theme-variables to each block's code
        // this has the advantage that by the time this code is run, the
        // overall elements are set up and we can use the getComputedStyle()
        // function to pass CSS-variables
        // let test   = getComputedStyle(document.documentElement).getPropertyValue('--red-0')
        // code = "%%{init: {'themeVariables': {'clusterBkg': '" + test + "'}}}%%\n" + code
        try {
          let graph = mermaid.mermaidAPI.render(`graphDivL${startLine}-L${endLine}${Date.now()}`, code)
          svg.innerHTML = graph
        } catch (err) {
          svg.classList.add('error')
          // TODO: Localise!
          svg.innerText = `Could not render Graph:\n\n${err.message}`
        }

        // Now add a line widget to this line.
        let textMarker = cm.doc.markText(
          { 'line': startLine, 'ch': 0 },
          { 'line': endLine, 'ch': 3 },
          {
            'clearOnEnter': true,
            'replacedWith': svg,
            'handleMouseEvents': true
          }
        )
        svg.onclick = (e) => { textMarker.clear() }
      }
    }
  }
})
