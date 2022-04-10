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
import { CodeFileMeta, MDFileMeta } from '@dts/common/fsal'
import { AnyMenuItem } from '@dts/renderer/context'

export default function displayTabsContext (event: MouseEvent, fileObject: MDFileMeta|CodeFileMeta, callback: (clickedID: string) => void): void {
  const items: AnyMenuItem[] = [
    {
      label: trans('menu.tab_close'),
      id: 'close-this',
      type: 'normal',
      enabled: true
    },
    {
      label: trans('menu.tab_close_others'),
      id: 'close-others',
      type: 'normal',
      enabled: true
    },
    {
      label: trans('menu.tab_close_all'),
      id: 'close-all',
      type: 'normal',
      enabled: true
    },
    {
      type: 'separator'
    },
    {
      label: trans('menu.copy_filename'),
      id: 'copy-filename',
      type: 'normal',
      enabled: true
    },
    {
      label: trans('menu.copy_abs_path'),
      id: 'copy-path',
      type: 'normal',
      enabled: true
    },
    {
      label: trans('menu.copy_id'),
      id: 'copy-id',
      type: 'normal',
      enabled: fileObject.type === 'file' && fileObject.id !== ''
    }
  ]

  const point = { x: event.clientX, y: event.clientY }
  showPopupMenu(point, items, callback)
}
