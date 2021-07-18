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
  // mermaid.mermaidAPI.initialize({ startOnLoad: false, theme: 'base'})

  /**
   * Defines the CodeMirror command to render all found markdown images.
   * @param  {CodeMirror} cm The calling CodeMirror instance
   * @return {void}    Commands do not return.
   */
  CodeMirror.commands.markdownRenderMermaid = function (cm) {
    let codeblock = [] // Holds a mermaid code block
    let currentCursorPosition = cm.getCursor('from').line

    // we need to initialize the mermaid API here, since we can only get the
    // CSS color variables by querying the computed style of created documents
    // get theme colors and font
    let mermaid_bg0   = getComputedStyle(document.querySelector(".CodeMirror")).getPropertyValue('--mermaid-bg0').replace(/\s+/g, '')
    let mermaid_bg1   = getComputedStyle(document.querySelector(".CodeMirror")).getPropertyValue('--mermaid-bg1').replace(/\s+/g, '')
    let mermaid_lines = getComputedStyle(document.querySelector(".CodeMirror")).getPropertyValue('--mermaid-lines').replace(/\s+/g, '')
    let mermaid_text  = getComputedStyle(document.querySelector(".CodeMirror")).getPropertyValue('--mermaid-text').replace(/\s+/g, '')
    let mermaid_text_contrast  = getComputedStyle(document.querySelector(".CodeMirror")).getPropertyValue('--mermaid-text-contrast').replace(/\s+/g, '')
    let mermaid_pop   = getComputedStyle(document.querySelector(".CodeMirror")).getPropertyValue('--mermaid-pop').replace(/\s+/g, '')
    let mermaid_pie1  = getComputedStyle(document.querySelector(".CodeMirror")).getPropertyValue('--mermaid-pie1').replace(/\s+/g, '')
    let mermaid_pie2  = getComputedStyle(document.querySelector(".CodeMirror")).getPropertyValue('--mermaid-pie2').replace(/\s+/g, '')
    let mermaid_pie3  = getComputedStyle(document.querySelector(".CodeMirror")).getPropertyValue('--mermaid-pie3').replace(/\s+/g, '')
    let mermaid_pie4  = getComputedStyle(document.querySelector(".CodeMirror")).getPropertyValue('--mermaid-pie4').replace(/\s+/g, '')
    let mermaid_pie5  = getComputedStyle(document.querySelector(".CodeMirror")).getPropertyValue('--mermaid-pie5').replace(/\s+/g, '')
    let mermaid_pie6  = getComputedStyle(document.querySelector(".CodeMirror")).getPropertyValue('--mermaid-pie6').replace(/\s+/g, '')
    let mermaid_pie7  = getComputedStyle(document.querySelector(".CodeMirror")).getPropertyValue('--mermaid-pie7').replace(/\s+/g, '')
    let mermaid_pie8  = getComputedStyle(document.querySelector(".CodeMirror")).getPropertyValue('--mermaid-pie8').replace(/\s+/g, '')
    let mermaid_pie9  = getComputedStyle(document.querySelector(".CodeMirror")).getPropertyValue('--mermaid-pie9').replace(/\s+/g, '')
    let mermaid_pie10 = getComputedStyle(document.querySelector(".CodeMirror")).getPropertyValue('--mermaid-pie10').replace(/\s+/g, '')
    let mermaid_pie11 = getComputedStyle(document.querySelector(".CodeMirror")).getPropertyValue('--mermaid-pie11').replace(/\s+/g, '')
    let mermaid_pie12 = getComputedStyle(document.querySelector(".CodeMirror")).getPropertyValue('--mermaid-pie12').replace(/\s+/g, '')
    let mermaid_font  = getComputedStyle(document.querySelector(".CodeMirror")).getPropertyValue('font-family')
    // re-initialize mermaid API
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
      'pieSectionTextColor': mermaid_text_contrast,
      'pieStrokeColor': mermaid_bg0,
      // state chart
      'altBackground'   : mermaid_bg1,
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
      'gridColor': mermaid_lines,
      'todayLineColor': mermaid_pop,
      'doneTaskBkgColor': mermaid_bg1,
      'doneTaskBorderColor': mermaid_lines,
      'activeTaskBkgColor': mermaid_pop,
      'activeTaskBorderColor': mermaid_pop,
      'taskBkgColor': mermaid_bg0,
      'taskBorderColor': mermaid_lines,
      'critBkgColor': mermaid_bg0,
      'critBorderColor': mermaid_pop,
      // this should be mermaid_bg1, but the element must be transparent to
      // show the gridlines underneath. with mermaid_lines, the result is roughly
      // the correct color
      'altSectionBkgColor': mermaid_lines,
    }})

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
