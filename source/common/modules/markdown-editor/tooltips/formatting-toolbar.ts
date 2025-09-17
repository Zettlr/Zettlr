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

import { EditorView, showTooltip, type Tooltip } from '@codemirror/view'
import { type EditorState, StateField } from '@codemirror/state'
import { applyBold, applyCode, applyComment, applyItalic, insertImage, insertLink } from '../commands/markdown'
import { trans } from '@common/i18n-renderer'
import { configField } from '../util/configuration'

function getToolbar (state: EditorState): Tooltip[] {
  const { showFormattingToolbar } = state.field(configField)
  const mainSel = state.selection.main
  if (mainSel.empty || !showFormattingToolbar) {
    return []
  }

  // Bold | Italic | Link | Image | Comment | Code

  return [{
    pos: mainSel.head,
    above: mainSel.head < mainSel.anchor,
    strictSide: false,
    arrow: true,
    create: (view) => {
      const dom = document.createElement('div')
      dom.className = 'cm-formatting-bar'

      const buttonWrapper = document.createElement('div')
      buttonWrapper.className = 'button-wrapper'

      const bold = document.createElement('button')
      bold.classList.add('formatting-toolbar-button')
      bold.setAttribute('title', trans('Bold'))
      bold.innerHTML = '<cds-icon shape="bold"></cds-icon>'

      const italic = document.createElement('button')
      italic.classList.add('formatting-toolbar-button')
      italic.setAttribute('title', trans('Italics'))
      italic.innerHTML = '<cds-icon shape="italic"></cds-icon>'

      const link = document.createElement('button')
      link.classList.add('formatting-toolbar-button')
      link.setAttribute('title', trans('Link'))
      link.innerHTML = '<cds-icon shape="link"></cds-icon>'

      const image = document.createElement('button')
      image.classList.add('formatting-toolbar-button')
      image.setAttribute('title', trans('Image'))
      image.innerHTML = '<cds-icon shape="image"></cds-icon>'

      const comment = document.createElement('button')
      comment.classList.add('formatting-toolbar-button')
      comment.setAttribute('title', trans('Comment'))
      comment.innerHTML = '<cds-icon shape="code"></cds-icon>'

      const code = document.createElement('button')
      code.classList.add('formatting-toolbar-button')
      code.setAttribute('title', trans('Code'))
      code.innerHTML = '<cds-icon shape="code-alt"></cds-icon>'

      buttonWrapper.append(bold, italic, link, image, comment, code)
      dom.append(buttonWrapper)

      // NOTE: We need to use the onmousedown event here, since the click only
      // triggers after onmouseup, and by that time the editor has gone through
      // a transaction cycle that has re-rendered the tooltip.
      bold.onmousedown = function (event) { applyBold(view) }
      italic.onmousedown = function (event) { applyItalic(view) }
      link.onmousedown = function (event) { insertLink(view) }
      image.onmousedown = function (event) { insertImage(view) }
      comment.onmousedown = function (event) { applyComment(view) }
      code.onmousedown = function (event) { applyCode(view) }

      return { dom }
    }
  }]
}

const formattingToolbarPlugin = StateField.define<readonly Tooltip[]>({
  create (state) {
    return getToolbar(state)
  },

  update (tooltips, transaction) {
    return getToolbar(transaction.state)
  },

  provide: f => showTooltip.computeN([f], state => state.field(f))
})

export const formattingToolbar = [
  formattingToolbarPlugin,
  EditorView.baseTheme({
    // Formatting bar
    '.cm-tooltip.cm-formatting-bar': {
      borderRadius: '8px',
      maxWidth: 'initial'
    },
    '.cm-tooltip.cm-formatting-bar .button-wrapper': {
      display: 'flex'
    },
    '.cm-tooltip.cm-formatting-bar button.formatting-toolbar-button': {
      border: 'none',
      margin: '0',
      backgroundColor: 'transparent',
      borderRadius: '0',
      lineHeight: '30px',
      padding: '0',
      width: '30px'
    },
    '&dark .cm-tooltip.cm-formatting-bar button.formatting-toolbar-button': {
      color: 'rgb(200, 200, 200)'
    },
    '.cm-tooltip.cm-formatting-bar button.formatting-toolbar-button:first-child': {
      borderTopLeftRadius: '8px',
      borderBottomLeftRadius: '8px'
    },
    '.cm-tooltip.cm-formatting-bar button.formatting-toolbar-button:last-child': {
      borderTopRightRadius: '8px',
      borderBottomRightRadius: '8px'
    }
  })
]
