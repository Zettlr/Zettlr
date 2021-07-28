/* global define CodeMirror */
/**
  * @ignore
  * BEGIN HEADER
  *
  * Contains:        Mermaid rendering Plugin
  * CVM-Role:        CodeMirror Plugin
  * Maintainer:      Hendrik Erz, Thaddäus Wiedemer
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
    const style = getComputedStyle(document.querySelector('.CodeMirror'))
    const mermaidBg0 = style.getPropertyValue('--mermaid-bg0').replace(/\s+/g, '')
    const mermaidBg1 = style.getPropertyValue('--mermaid-bg1').replace(/\s+/g, '')
    const mermaidLines = style.getPropertyValue('--mermaid-lines').replace(/\s+/g, '')
    const mermaidText = style.getPropertyValue('--mermaid-text').replace(/\s+/g, '')
    const mermaidTextContrast = style.getPropertyValue('--mermaid-text-contrast').replace(/\s+/g, '')
    const mermaidPop = style.getPropertyValue('--mermaid-pop').replace(/\s+/g, '')
    const mermaidPie1 = style.getPropertyValue('--mermaid-pie1').replace(/\s+/g, '')
    const mermaidPie2 = style.getPropertyValue('--mermaid-pie2').replace(/\s+/g, '')
    const mermaidPie3 = style.getPropertyValue('--mermaid-pie3').replace(/\s+/g, '')
    const mermaidPie4 = style.getPropertyValue('--mermaid-pie4').replace(/\s+/g, '')
    const mermaidPie5 = style.getPropertyValue('--mermaid-pie5').replace(/\s+/g, '')
    const mermaidPie6 = style.getPropertyValue('--mermaid-pie6').replace(/\s+/g, '')
    const mermaidPie7 = style.getPropertyValue('--mermaid-pie7').replace(/\s+/g, '')
    const mermaidPie8 = style.getPropertyValue('--mermaid-pie8').replace(/\s+/g, '')
    const mermaidPie9 = style.getPropertyValue('--mermaid-pie9').replace(/\s+/g, '')
    const mermaidPie10 = style.getPropertyValue('--mermaid-pie10').replace(/\s+/g, '')
    const mermaidPie11 = style.getPropertyValue('--mermaid-pie11').replace(/\s+/g, '')
    const mermaidPie12 = style.getPropertyValue('--mermaid-pie12').replace(/\s+/g, '')
    const mermaidFont = style.getPropertyValue('font-family')
    // re-initialize mermaid API
    mermaid.mermaidAPI.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        // main body is colored to see extend of diagram
        // first-level containers use same background color
        'background': mermaidBg0,
        'primaryColor': mermaidBg0,
        'secondaryColor': mermaidBg0,
        'tertiaryColor': mermaidBg0,
        'mainBkg': mermaidBg0,
        // second-level containers are a shade darker
        // fields in loop
        'noteBkgColor': mermaidBg1,
        // all borders use the same color
        'primaryBorderColor': mermaidLines,
        'secondrayBorderColor': mermaidLines,
        'tertiaryBorderColor': mermaidLines,
        'noteBorderColor': mermaidBg1,
        // lines and highlited elements use theme color
        'lineColor': mermaidPop,
        // all text to uses the same color
        'fontFamily': mermaidFont,
        'primaryTextColor': mermaidText,
        'secondaryTextColor': mermaidText,
        'tertiaryTextColor': mermaidText,
        'textColor': mermaidText,
        'noteTextColor': mermaidText,
        // graph
        'arrowheadColor': mermaidPop,
        // flowchart
        'clusterBkg': mermaidBg1,
        // sequence chart
        'actorLineColor': mermaidLines,
        'labelBoxBorderColor': mermaidLines,
        'signalColor': mermaidPop,
        'activationBorderColor': mermaidPop,
        'signalTextColor': mermaidText,
        // pie chart
        'pie1': mermaidPie1,
        'pie2': mermaidPie2,
        'pie3': mermaidPie3,
        'pie4': mermaidPie4,
        'pie5': mermaidPie5,
        'pie6': mermaidPie6,
        'pie7': mermaidPie7,
        'pie8': mermaidPie8,
        'pie9': mermaidPie9,
        'pie10': mermaidPie10,
        'pie11': mermaidPie11,
        'pie12': mermaidPie12,
        'pieOpacity': '0.8',
        'pieSectionTextColor': mermaidTextContrast,
        'pieStrokeColor': mermaidBg0,
        // state chart
        'altBackground': mermaidBg1,
        // user journey diagram
        'fillType0': mermaidBg0,
        'fillType1': mermaidBg1,
        'fillType2': mermaidBg0,
        'fillType3': mermaidBg1,
        'fillType4': mermaidBg0,
        'fillType5': mermaidBg1,
        'fillType6': mermaidBg0,
        'fillType7': mermaidBg1,
        // gantt chart
        'gridColor': mermaidLines,
        'todayLineColor': mermaidPop,
        'doneTaskBkgColor': mermaidBg1,
        'doneTaskBorderColor': mermaidLines,
        'activeTaskBkgColor': mermaidPop,
        'activeTaskBorderColor': mermaidPop,
        'taskBkgColor': mermaidBg0,
        'taskBorderColor': mermaidLines,
        'critBkgColor': mermaidBg0,
        'critBorderColor': mermaidPop,
        // this should be mermaid_bg1, but the element must be transparent to
        // show the gridlines underneath. with mermaid_lines, the result is roughly
        // the correct color
        'altSectionBkgColor': mermaidLines
      }
    })

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
