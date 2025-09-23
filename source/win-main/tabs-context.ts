/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        displayTabsContext
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This function displays a document-tabs-specific context menu.
 *
 * END HEADER
 */

import { trans } from '@common/i18n-renderer'
import showPopupMenu, { type AnyMenuItem } from '@common/modules/window-register/application-menu-helper'
import type { OpenDocument } from '@dts/common/documents'
import type { CodeFileDescriptor, MDFileDescriptor, OtherFileDescriptor } from '@dts/common/fsal'

export function displayTabbarContext (event: MouseEvent, callback: (clickedID: string) => void): void {
  const items: AnyMenuItem[] = [
    {
      label: 'Close leaf',
      id: 'close-leaf',
      type: 'normal'
    }
  ]

  const point = { x: event.clientX, y: event.clientY }
  showPopupMenu(point, items, callback)
}

export default function displayTabsContext (event: MouseEvent, fileObject: MDFileDescriptor|CodeFileDescriptor|OtherFileDescriptor, doc: OpenDocument, callback: (clickedID: string) => void): void {
  const isMac = process.platform === 'darwin'
  const isWin = process.platform === 'win32'

  const items: AnyMenuItem[] = [
    {
      label: trans('Close tab'),
      id: 'close-this',
      type: 'normal',
      enabled: !doc.pinned
    },
    {
      label: trans('Close other tabs'),
      id: 'close-others',
      type: 'normal'
    },
    {
      label: trans('Close all tabs'),
      id: 'close-all',
      type: 'normal',
      enabled: !doc.pinned
    },
    {
      type: 'separator'
    },
    {
      label: doc.pinned ? trans('Unpin tab') : trans('Pin tab'),
      id: 'pin-tab',
      type: 'normal'
    },
    {
      type: 'separator'
    },
    {
      label: trans('Copy filename'),
      id: 'copy-filename',
      type: 'normal'
    },
    {
      label: trans('Copy path'),
      id: 'copy-path',
      type: 'normal'
    },
    {
      label: isMac ? trans('Reveal in Finder') : isWin ? trans('Reveal in Explorer') : trans('Reveal in File Browser'),
      id: 'show-in-folder',
      type: 'normal'
    },
    {
      label: trans('Copy ID'),
      id: 'copy-id',
      type: 'normal',
      enabled: fileObject.type === 'file' && fileObject.id !== ''
    }
  ]

  const point = { x: event.clientX, y: event.clientY }
  showPopupMenu(point, items, callback)
}
