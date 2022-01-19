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

export default function displayTabsContext (event: MouseEvent, callback: (clickedID: string) => void): void {
  const items: any = [
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
    }
  ]

  const point = { x: event.clientX, y: event.clientY }
  showPopupMenu(point, items, callback)
}
