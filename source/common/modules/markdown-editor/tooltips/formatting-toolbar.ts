/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Formatting Toolbar
 * CVM-Role:        Extension
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This extension can display a formatting bar for selections.
 *
 * END HEADER
 */

import { Tooltip, showTooltip } from '@codemirror/view'
import { EditorState, StateField } from '@codemirror/state'
import { applyBold, applyCode, applyComment, applyItalic, insertImage, insertLink } from '../commands/markdown'
import { trans } from '@common/i18n-renderer'

function getToolbar (state: EditorState): Tooltip[] {
  const mainSel = state.selection.main
  if (mainSel.empty) {
    return []
  }

  // Bold | Italic | Link | Image | Comment | Code

  return [{
    pos: mainSel.head,
    above: mainSel.head < mainSel.anchor,
    strictSide: false,
    arrow: true,
    create: () => {
      const dom = document.createElement('div')
      dom.className = 'cm-formatting-bar'

      const buttonWrapper = document.createElement('div')
      buttonWrapper.className = 'button-wrapper'

      const bold = document.createElement('button')
      bold.classList.add('formatting-toolbar-button')
      bold.setAttribute('title', trans('Bold'))
      bold.innerHTML = '<clr-icon shape="bold"></clr-icon>'

      const italic = document.createElement('button')
      italic.classList.add('formatting-toolbar-button')
      italic.setAttribute('title', trans('Italics'))
      italic.innerHTML = '<clr-icon shape="italic"></clr-icon>'

      const link = document.createElement('button')
      link.classList.add('formatting-toolbar-button')
      link.setAttribute('title', trans('Link'))
      link.innerHTML = '<clr-icon shape="link"></clr-icon>'

      const image = document.createElement('button')
      image.classList.add('formatting-toolbar-button')
      image.setAttribute('title', trans('Image'))
      image.innerHTML = '<clr-icon shape="image"></clr-icon>'

      const comment = document.createElement('button')
      comment.classList.add('formatting-toolbar-button')
      comment.setAttribute('title', trans('Comment'))
      comment.innerHTML = '<clr-icon shape="code-alt"></clr-icon>'

      const code = document.createElement('button')
      code.classList.add('formatting-toolbar-button')
      code.setAttribute('title', trans('Code'))
      code.innerHTML = '<clr-icon shape="code"></clr-icon>'

      buttonWrapper.append(bold, italic, link, image, comment, code)
      dom.append(buttonWrapper)
      return {
        dom,
        mount (view) {
          bold.onclick = function (event) { applyBold(view) }
          italic.onclick = function (event) { applyItalic(view) }
          link.onclick = function (event) { insertLink(view) }
          image.onclick = function (event) { insertImage(view) }
          comment.onclick = function (event) { applyComment(view) }
          code.onclick = function (event) { applyCode(view) }
        }
      }
    }
  }]
}

export const formattingToolbar = StateField.define<readonly Tooltip[]>({
  create (state) {
    return getToolbar(state)
  },

  update (tooltips, transaction) {
    if (transaction.selection === undefined) {
      return tooltips
    }

    return getToolbar(transaction.state)
  },

  provide: f => showTooltip.computeN([f], state => state.field(f))
})
