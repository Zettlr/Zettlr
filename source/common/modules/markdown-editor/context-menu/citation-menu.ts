/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        citationMenu
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Displays a context menu for a given citation
 *
 * END HEADER
 */

import { type EditorView } from '@codemirror/view'
import showPopupMenu, { type AnyMenuItem } from '@common/modules/window-register/application-menu-helper'
import { configField } from '../util/configuration'
import { trans } from 'source/common/i18n-renderer'
import { CITEPROC_MAIN_DB } from 'source/types/common/citeproc'
import { nodeToCiteItem } from '../parser/citation-parser'
import type { SyntaxNode } from '@lezer/common'

const ipcRenderer = window.ipc

/**
 * Displays a context menu appropriate for citations
 *
 * @param   {EditorView}                view    The view
 * @param   {{ x: number, y: number }}  coords  Where to display it
 * @param   {string[]}                  keys    The citation keys
 * @param   {string}                    label   An optional label
 */
export function citationMenu (view: EditorView, coords: { x: number, y: number }, citationNode: SyntaxNode): void {
  // Calculate the relevant state
  const config = view.state.field(configField).metadata.library
  const callback = window.getCitationCallback(config === '' ? CITEPROC_MAIN_DB : config)
  const citation = nodeToCiteItem(citationNode.node, view.state.sliceDoc())
  const items = Object.fromEntries(citation.items.map(({ id }) => {
    return [ id, callback([{ id }], true) ?? id ]
  }))
  const label = callback(citation.items, citation.composite) ?? view.state.sliceDoc(citationNode.from, citationNode.to)

  const tpl: AnyMenuItem[] = []

  if (label.trim() !== '') {
    tpl.push({
      label,
      type: 'normal',
      enabled: false,
      id: label
    },
    { type: 'separator' })
  }

  const filePath = view.state.field(configField).metadata.path

  for (const [ key, label ] of Object.entries(items)) {
    tpl.push({
      label,
      sublabel: process.platform === 'darwin' ? trans('Open PDF for %s', label) : undefined,
      type: 'normal',
      action () {
        ipcRenderer.invoke('application', {
          command: 'open-attachment',
          payload: { citekey: key, filePath }
        })
          .catch((err: unknown) => console.error(err))
      }
    })
  }

  showPopupMenu(coords, tpl)
}
