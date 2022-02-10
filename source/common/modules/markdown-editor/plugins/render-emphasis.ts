/**
  * @ignore
  * BEGIN HEADER
  *
  * Contains:        Emphasis rendering plugin
  * CVM-Role:        CodeMirror Plugin
  * Maintainer:      Hendrik Erz
  * License:         GNU GPL v3
  *
  * Description:     This plugin renders emphasis such as italics and bold
  *
  * END HEADER
  */

import CodeMirror, { commands } from 'codemirror'

const emphasisRE = /(?<![\\])([*_]{1,3}|~{2})((?!\s)[^*_]+?(?<![\s\\]))(?:[*_]{1,3}|~{2})/g

/**
 * Declare the markdownRenderEmphasis command
 *
 * @param   {CodeMirror.Editor}  cm  The CodeMirror instance
 */
;(commands as any).markdownRenderEmphasis = function (cm: CodeMirror.Editor) {
  // We'll only render the viewport
  const viewport = cm.getViewport()
  for (let i = viewport.from; i < viewport.to; i++) {
    if (cm.getModeAt({ line: i, ch: 0 }).name !== 'markdown-zkn') {
      continue
    }

    // First get the line and test if the contents contain a link
    const line = cm.getLine(i)

    for (const match of line.matchAll(emphasisRE)) {
      const which = match[1].length // 1=italic, 2=bold, 3=italic and bold
      // Since we're using matchAll, index will not be undefined
      const from = { line: i, ch: match.index as number }
      const to = { line: i, ch: match.index as number + match[0].length }

      const cur = cm.getCursor('from')
      if (cur.line === from.line && cur.ch >= from.ch && cur.ch <= to.ch) {
        // Cursor is in selection: Do not render.
        continue
      }

      // We can only have one marker at any given position at any given time
      if (cm.findMarks(from, to).length > 0) {
        continue
      }

      const span = document.createElement('span')
      switch (which) {
        case 1: // Italic
          span.style.fontStyle = 'italic'
          break
        case 2: // Bold or strikethrough
          if (match[1] === '~~') {
            span.style.textDecoration = 'line-through'
          } else {
            span.style.fontWeight = 'bold'
          }
          break
        case 3: // Both
          span.style.fontStyle = 'italic'
          span.style.fontWeight = 'bold'
          break
      }

      // Replace the few things that can be part of an emphasis
      let contents = match[2]
      contents = contents.replace(/~~([^~]+?)~~/g, '<del>$1</del>')
      contents = contents.replace(/`([^`]+?)`/g, '<code>$1</code>')

      span.innerHTML = contents

      const textMarker = cm.markText(
        from, to,
        {
          className: 'test',
          clearOnEnter: true,
          replacedWith: span,
          inclusiveLeft: false,
          inclusiveRight: false
        }
      )

      span.onclick = function (e) {
        textMarker.clear()
        cm.setCursor(cm.coordsChar({ left: e.clientX, top: e.clientY }))
        cm.focus()
      }
    }
  } // END for-loop
}
