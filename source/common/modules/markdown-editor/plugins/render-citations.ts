/**
  * @ignore
  * BEGIN HEADER
  *
  * Contains:        Citation rendering Plugin
  * CVM-Role:        CodeMirror Plugin
  * Maintainer:      Hendrik Erz
  * License:         GNU GPL v3
  *
  * Description:     This plugin renders citations in the document
  *
  * END HEADER
  */

import CodeMirror, { commands } from 'codemirror'
import extractCitations from '@common/util/extract-citations'
import canRenderElement from './util/can-render-element'
const ipcRenderer = window.ipc

/**
 * Renders Markdown citations in place
 *
 * @param   {CodeMirror.Editor}  cm  The CodeMirror instance
 */
;(commands as any).markdownRenderCitations = function (cm: CodeMirror.Editor) {
  // We'll only render the viewport
  const viewport = cm.getViewport()
  for (let i = viewport.from; i < viewport.to; i++) {
    if (cm.getModeAt({ line: i, ch: 0 }).name !== 'markdown-zkn') continue

    // First get the line and test if the contents contain a link
    const line = cm.getLine(i)
    const citations = extractCitations(line)

    for (const citation of citations) {
      if (citation.citations.length === 0) {
        continue // The module could not find any valid citations
      }

      const curFrom = { line: i, ch: citation.from }
      const curTo = { line: i, ch: citation.to }

      if (!canRenderElement(cm, curFrom, curTo)) {
        continue
      }

      // A final check, as there is an edge case where if people use [[]] as
      // their internal links, and decide to use @-characters somewhere in
      // there, this plugin will attempt to render this as a citation as well
      // Hence: The citation shall not be encapsulated in square brackets.
      // See https://github.com/Zettlr/Zettlr/issues/1046
      if (line.substring(curFrom.ch - 1, 2) === '[[' && line.substring(curTo.ch - 1, 2) === ']]') {
        continue
      }

      // If we're at this point, we can actually render something!
      const span = document.createElement('span')
      span.className = 'citeproc-citation'
      const key = citation.citations.map(elem => elem.id).join(',')
      span.dataset.citekeys = key // data-citekeys="key1,key2"; necessary for the context menu
      span.textContent = line.substring(citation.from, citation.to)
      // Apply TextMarker
      const textMarker = cm.markText(
        curFrom, curTo,
        {
          clearOnEnter: true,
          replacedWith: span,
          inclusiveLeft: false,
          inclusiveRight: false
        }
      )

      span.onclick = (e) => {
        textMarker.clear()
        cm.setCursor(cm.coordsChar({ left: e.clientX, top: e.clientY }))
        cm.focus()
      }

      // Prevent the contextmenu handler from selecting anything within the
      // rendered citation
      span.oncontextmenu = (e) => {
        e.preventDefault()
      }

      // Now that everything is done, request the citation and replace the
      // text contents accordingly

      ipcRenderer.invoke('citeproc-provider', {
        command: 'get-citation',
        payload: { citations: citation.citations, composite: citation.composite }
      })
        .then((payload) => {
          if (payload !== undefined) {
            // We need to set the HTML as citeproc may spit out <i>-tags etc.
            span.innerHTML = payload
            textMarker.changed()
          } else {
            span.classList.add('error')
          }
        })
        .catch(e => console.error(e))
    }
  }
}
