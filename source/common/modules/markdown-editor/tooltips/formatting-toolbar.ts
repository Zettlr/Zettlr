// Shows a formatting toolbar if there's a main non-empty selection
import { Tooltip, showTooltip } from '@codemirror/view'
import { EditorState, StateField } from '@codemirror/state'
import { applyBold, applyCode, applyComment, applyItalic } from '../commands/markdown'

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
      bold.innerHTML = '<clr-icon shape="bold"></clr-icon>'

      const italic = document.createElement('button')
      italic.classList.add('formatting-toolbar-button')
      italic.innerHTML = '<clr-icon shape="italic"></clr-icon>'

      const link = document.createElement('button')
      link.classList.add('formatting-toolbar-button')
      link.innerHTML = '<clr-icon shape="link"></clr-icon>'

      const image = document.createElement('button')
      image.classList.add('formatting-toolbar-button')
      image.innerHTML = '<clr-icon shape="image"></clr-icon>'

      const comment = document.createElement('button')
      comment.classList.add('formatting-toolbar-button')
      comment.innerHTML = '<clr-icon shape="code-alt"></clr-icon>'

      const code = document.createElement('button')
      code.classList.add('formatting-toolbar-button')
      code.innerHTML = '<clr-icon shape="code"></clr-icon>'

      buttonWrapper.append(bold, italic, link, image, comment, code)
      dom.append(buttonWrapper)
      return {
        dom,
        mount (view) {
          bold.onclick = function (event) { applyBold(view) }
          italic.onclick = function (event) { applyItalic(view) }
          link.onclick = function (event) { /* TODO: Insert link */ }
          image.onclick = function (event) { /* TODO: Insert image */ }
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
