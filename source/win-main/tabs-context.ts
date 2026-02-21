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

import showPopupMenu, { type AnyMenuItem } from '@common/modules/window-register/application-menu-helper'

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
