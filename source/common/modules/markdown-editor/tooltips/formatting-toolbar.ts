// Shows a formatting toolbar if there's a main non-empty selection
import { Tooltip, showTooltip } from '@codemirror/view'
import { EditorState, StateField } from '@codemirror/state'

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
      const dom = document.createElement("div")
      dom.className = "cm-tooltip-cursor"

      const bold = document.createElement('button')
      bold.classList.add('formatting-toolbar-button')
      bold.textContent = 'B'

      const italic = document.createElement('button')
      italic.classList.add('formatting-toolbar-button')
      italic.textContent = 'i'

      const link = document.createElement('button')
      link.classList.add('formatting-toolbar-button')
      link.textContent = 'l'

      const image = document.createElement('button')
      image.classList.add('formatting-toolbar-button')
      image.textContent = 'img'

      const comment = document.createElement('button')
      comment.classList.add('formatting-toolbar-button')
      comment.textContent = '<>'

      const code = document.createElement('button')
      code.classList.add('formatting-toolbar-button')
      code.textContent = '</>'

      dom.append(bold, italic, link, image, comment, code)
      return { dom }
    }
  }]
}

export const formattingToolbar = StateField.define<readonly Tooltip[]>({
  create (state) {
    return getToolbar(state)
  },

  update(tooltips, transaction) {
    if (!transaction.selection) {
      return tooltips
    }

    return getToolbar(transaction.state)
  },

  provide: f => showTooltip.computeN([f], state => state.field(f))
})
