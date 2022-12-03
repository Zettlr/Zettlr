/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        defaultMenu function
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Contains a utility function to show a basic Markdown context
 *                  menu
 *
 * END HEADER
 */

import { EditorView } from '@codemirror/view'
import { trans } from '@common/i18n-renderer'
import showPopupMenu from '@common/modules/window-register/application-menu-helper'
import { AnyMenuItem } from '@dts/renderer/context'
import { SyntaxNode } from '@lezer/common'
import { applyBold, applyItalic, insertLink, applyBlockquote, applyOrderedList, applyBulletList, applyTaskList } from '../commands/markdown'
import { cut, copyAsPlain, copyAsHTML, paste, pasteAsPlain } from '../util/copy-paste-cut'

/**
 * Shows a default context menu for the given node at the given coordinates in
 * the given view.
 *
 * @param   {EditorView}                view    The view
 * @param   {SyntaxNode}                node    The node
 * @param   {{ x: number, y: number }}  coords  The screen coordinates
 */
export function defaultMenu (view: EditorView, node: SyntaxNode, coords: { x: number, y: number }): void {
  const tpl: AnyMenuItem[] = [
    {
      label: trans('Bold'),
      accelerator: 'CmdOrCtrl+B',
      id: 'markdownBold',
      type: 'normal',
      enabled: true
    },
    {
      label: trans('Italic'),
      accelerator: 'CmdOrCtrl+I',
      id: 'markdownItalic',
      type: 'normal',
      enabled: true
    },
    {
      type: 'separator'
    },
    {
      label: trans('Insert link'),
      accelerator: 'CmdOrCtrl+K',
      id: 'markdownLink',
      type: 'normal',
      enabled: true
    },
    {
      label: trans('Insert numbered list'),
      id: 'markdownMakeOrderedList',
      type: 'normal',
      enabled: true
    },
    {
      label: trans('Insert unordered list'),
      id: 'markdownMakeUnorderedList',
      type: 'normal',
      enabled: true
    },
    {
      label: trans('Insert tasklist'),
      accelerator: 'CmdOrCtrl+T',
      id: 'markdownMakeTaskList',
      type: 'normal',
      enabled: true
    },
    {
      label: trans('Blockquote'),
      id: 'markdownBlockquote',
      type: 'normal',
      enabled: true
    },
    {
      label: trans('Insert Table'),
      id: 'markdownInsertTable',
      type: 'normal',
      enabled: true
    },
    {
      type: 'separator'
    },
    {
      label: trans('Cut'),
      accelerator: 'CmdOrCtrl+X',
      id: 'cut',
      type: 'normal',
      enabled: true
    },
    {
      label: trans('Copy'),
      accelerator: 'CmdOrCtrl+C',
      id: 'copy',
      type: 'normal',
      enabled: true
    },
    {
      label: trans('Copy as HTML'),
      accelerator: 'CmdOrCtrl+Alt+C',
      id: 'copyAsHTML',
      type: 'normal',
      enabled: true
    },
    {
      label: trans('Paste'),
      accelerator: 'CmdOrCtrl+V',
      id: 'paste',
      type: 'normal',
      enabled: true
    },
    {
      label: trans('Paste without style'),
      accelerator: 'CmdOrCtrl+Shift+V',
      id: 'pasteAsPlain',
      type: 'normal',
      enabled: true
    },
    {
      type: 'separator'
    },
    {
      label: trans('Select all'),
      accelerator: 'CmdOrCtrl+A',
      id: 'selectAll',
      type: 'normal',
      enabled: true
    }
  ]

  showPopupMenu(coords, tpl, (clickedID) => {
    if (clickedID === 'markdownBold') {
      applyBold(view)
    } else if (clickedID === 'markdownItalic') {
      applyItalic(view)
    } else if (clickedID === 'markdownLink') {
      insertLink(view)
    } else if (clickedID === 'markdownMakeOrderedList') {
      applyOrderedList(view)
    } else if (clickedID === 'markdownMakeUnorderedList') {
      applyBulletList(view)
    } else if (clickedID === 'markdownMakeTaskList') {
      applyTaskList(view)
    } else if (clickedID === 'markdownBlockquote') {
      applyBlockquote(view)
    } else if (clickedID === 'markdownInsertTable') {
      // TODO
    } else if (clickedID === 'cut') {
      cut(view)
    } else if (clickedID === 'copy') {
      copyAsPlain(view)
    } else if (clickedID === 'copyAsHTML') {
      copyAsHTML(view)
    } else if (clickedID === 'paste') {
      paste(view)
    } else if (clickedID === 'pasteAsPlain') {
      pasteAsPlain(view)
    } else if (clickedID === 'selectAll') {
      view.dispatch({ selection: { anchor: 0, head: view.state.doc.length } })
    }
  })
}
