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

const ipcRenderer = window.ipc

/**
 * Displays a context menu appropriate for citations
 *
 * @param   {EditorView}                view    The view
 * @param   {{ x: number, y: number }}  coords  Where to display it
 * @param   {string[]}                  keys    The citation keys
 * @param   {string}                    label   An optional label
 */
export function citationMenu (view: EditorView, coords: { x: number, y: number }, keys: string[], label?: string): void {
  const tpl: AnyMenuItem[] = []

  if (label !== undefined && label.trim() !== '') {
    tpl.push({
      label,
      type: 'normal',
      enabled: false,
      id: label
    },
    { type: 'separator' })
  }

  for (const key of keys) {
    tpl.push({
      label: key,
      id: 'citekey-' + key,
      type: 'normal'
    })
  }

  const filePath = view.state.field(configField).metadata.path

  showPopupMenu(coords, tpl, (clickedID) => {
    if (!clickedID.startsWith('citekey-')) {
      return
    }

    ipcRenderer.invoke('application', {
      command: 'open-attachment',
      payload: { citekey: clickedID.substring(8), filePath }
    })
      .catch((err: any) => console.error(err))
  })
}
