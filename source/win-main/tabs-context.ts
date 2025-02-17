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
import showPopupMenu from '@common/modules/window-register/application-menu-helper'
import type { OpenDocument } from '@dts/common/documents'
import type { CodeFileDescriptor, MDFileDescriptor } from '@dts/common/fsal'
import type { AnyMenuItem } from '@dts/renderer/context'

export function displayTabbarContext (event: MouseEvent, callback: (clickedID: string) => void): void {
  const items: AnyMenuItem[] = [
    {
      label: 'Close leaf',
      id: 'close-leaf',
      type: 'normal',
      enabled: true
    }
  ]

  const point = { x: event.clientX, y: event.clientY }
  showPopupMenu(point, items, callback)
}

export default function displayTabsContext (event: MouseEvent, fileObject: MDFileDescriptor|CodeFileDescriptor, doc: OpenDocument, callback: (clickedID: string) => void): void {
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
      type: 'normal',
      enabled: true
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
      type: 'normal',
      enabled: true
    },
    {
      type: 'separator'
    },
    {
      label: trans('Copy filename'),
      id: 'copy-filename',
      type: 'normal',
      enabled: true
    },
    {
      label: trans('Copy path'),
      id: 'copy-path',
      type: 'normal',
      enabled: true
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
