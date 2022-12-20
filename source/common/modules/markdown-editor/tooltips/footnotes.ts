/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Footnote Tooltips
 * CVM-Role:        Extension
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This extension displays previews of footnotes on hover.
 *
 * END HEADER
 */

import { EditorView, hoverTooltip, Tooltip } from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import { EditorState } from '@codemirror/state'
import { getConverter } from '@common/util/md-to-html'
import { configField } from '../util/configuration'
import { trans } from '@common/i18n-renderer'

/**
 * Given fn in the format [^some-identifier], this function attempts to find a
 * footnote's body in the document.
 *
 * @param   {EditorState}       state  The state
 * @param   {string}            fn     The footnote to match with a ref
 *
 * @return  {{ from: number, to: number, text: string }|undefined}         Either the body, or undefined
 */
function findRefForFootnote (state: EditorState, fn: string): { from: number, to: number, text: string }|undefined {
  let text: { from: number, to: number, text: string }|undefined
  // Find the corresponding ref
  syntaxTree(state).iterate({
    enter (node) {
      if (node.type.name === 'Document') {
        return // Ignore but traverse down
      }

      if (node.type.name !== 'FootnoteRef') {
        return false // Do not traverse down
      }

      // Check the contents
      const ref = state.sliceDoc(node.from, node.to)

      if (ref !== fn + ':') {
        return false
      }

      // We got the actual ref. The next sibling is the footnote's body (if any).
      const body = node.node.nextSibling
      if (body === null) {
        return false
      }

      text = {
        from: body.from,
        to: body.to,
        text: state.sliceDoc(body.from, body.to)
      }
    }
  })

  return text
}

/**
 * If the user currently hovers over a footnote, this function returns the specs
 * to create a tooltip with the footnote ref's contents, else null.
 */
function footnotesTooltip (view: EditorView, pos: number, side: 1 | -1): Tooltip|null {
  let { from, text } = view.state.doc.lineAt(pos)
  const fnRE = /\[\^.+?\](?!:)/g
  const relativePos = pos - from

  let footnoteMatch: RegExpMatchArray|null = null
  for (const match of text.matchAll(fnRE)) {
    if (match.index as number > relativePos || match.index as number + match[0].length < relativePos) {
      continue
    }
    footnoteMatch = match
    break
  }

  if (footnoteMatch === null) {
    return null
  }

  const fn = footnoteMatch[0]

  if (fn.endsWith('^]')) {
    return null // It's an inline footnote
  }

  const fnBody = findRefForFootnote(view.state, fn)

  const { library } = view.state.field(configField).metadata
  const md2html = getConverter(window.getCitationCallback(library))
  const tooltipContent = md2html(fnBody?.text ?? trans('No footnote text found.'))

  return {
    pos: from + (footnoteMatch.index as number),
    end: from + (footnoteMatch.index as number) + footnoteMatch[0].length,
    above: true,
    create (view) {
      const dom = document.createElement('div')
      dom.innerHTML = tooltipContent
      if (fnBody !== undefined) {
        const editButton = document.createElement('button')
        editButton.textContent = trans('Edit')
        dom.appendChild(editButton)
        editButton.addEventListener('click', e => {
          view.dispatch({
            selection: { anchor: fnBody.from, head: fnBody.to },
            scrollIntoView: true
          })
        })
      }
      return { dom }
    }
  }
}

export const footnoteHover = hoverTooltip(footnotesTooltip, { hoverTime: 100 })
