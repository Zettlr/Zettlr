/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        macOS lookup menu item
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Creates a context menu item for looking up the current
 *                  editor selection in the macOS dictionary.
 *
 * END HEADER
 */

import { type EditorView } from '@codemirror/view'
import { trans } from '@common/i18n-renderer'
import { type AnyMenuItem } from '@common/modules/window-register/application-menu-helper'
import { type WindowControlsIPCAPI } from '@providers/windows'

const ipcRenderer = window.ipc

export function getMacOSLookupItem (view: EditorView): AnyMenuItem|undefined {
  // Only macOS provides a native dictionary popover for the current selection
  if (process.platform !== 'darwin') {
    return undefined
  }

  const selection = view.state.selection.main
  if (selection.empty) {
    return undefined
  }

  const selectedText = view.state.sliceDoc(selection.from, selection.to)
  return {
    label: trans('Look Up “%s”', selectedText),
    type: 'normal',
    action () {
      ipcRenderer.send('window-controls', {
        command: 'show-definition-for-selection',
        payload: undefined
      } as WindowControlsIPCAPI)
    }
  }
}
