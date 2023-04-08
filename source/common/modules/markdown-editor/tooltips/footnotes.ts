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

import { type EditorView, hoverTooltip, type Tooltip } from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import { type EditorState } from '@codemirror/state'
import { configField } from '../util/configuration'
import { trans } from '@common/i18n-renderer'
import { md2html } from '@common/modules/markdown-utils'

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

      const label = node.node.getChild('FootnoteRefLabel')
      const body = node.node.getChild('FootnoteRefBody')

      if (label === null || body === null) {
        return false // Should not happen, but you never know
      }

      // Check the contents
      const ref = state.sliceDoc(label.from, label.to)

      if (ref !== fn + ':') {
        return false // Not the right one
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
  const nodeAt = syntaxTree(view.state).resolve(pos, side)
  if (nodeAt.type.name !== 'Footnote') {
    return null
  }

  const fn = view.state.sliceDoc(nodeAt.from, nodeAt.to)

  if (fn.endsWith('^]')) {
    return null // It's an inline footnote
  }

  const fnBody = findRefForFootnote(view.state, fn)

  const { library } = view.state.field(configField).metadata
  const tooltipContent = md2html(fnBody?.text ?? trans('No footnote text found.'), library)

  return {
    pos: nodeAt.from,
    end: nodeAt.to,
    above: true,
    create (view) {
      const dom = document.createElement('div')
      dom.innerHTML = tooltipContent
      if (fnBody === undefined) {
        return { dom }
      }

      const editButton = document.createElement('button')
      editButton.textContent = trans('Edit')
      dom.appendChild(editButton)

      editButton.addEventListener('click', e => {
        // Replace the contents with the footnote's contents to allow editing
        dom.innerHTML = ''
        const p = document.createElement('p')
        const textarea = document.createElement('textarea')
        textarea.value = fnBody.text
        textarea.style.minWidth = '250px'
        textarea.style.minHeight = '150px'
        p.appendChild(textarea)
        dom.appendChild(p)

        const acceptButton = document.createElement('button')
        acceptButton.textContent = trans('Save')
        dom.appendChild(acceptButton)

        acceptButton.addEventListener('click', e => {
          // Exchange footnote content & restore
          view.dispatch({
            changes: {
              from: fnBody.from, to: fnBody.to, insert: textarea.value
            }
          })
          dom.innerHTML = md2html(textarea.value, library)
          dom.appendChild(editButton)
        })

        const cancelButton = document.createElement('button')
        cancelButton.textContent = trans('Cancel')
        dom.appendChild(cancelButton)

        cancelButton.addEventListener('click', e => {
          // Restore tooltip
          dom.innerHTML = tooltipContent
          dom.appendChild(editButton)
        })
      })
      return { dom }
    }
  }
}

export const footnoteHover = hoverTooltip(footnotesTooltip, { hoverTime: 100 })
