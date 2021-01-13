/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Clarity icons helper
 * CVM-Role:        Utility
 * Maintainer:      Wieke Kanters
 * License:         GNU GPL v3
 *
 * Description:     This module loads the clarity library and adds custom icons.
 *
 * END HEADER
 */

import { ClarityIcons } from '@clr/icons'
import '@clr/icons/shapes/all-shapes'

export default async function loadIcons (): Promise<void> {
  // We use the svg-inline-loader, because clarity expects a plain svg string and not a javascript module
  /* eslint-disable import/no-webpack-loader-syntax */
  ClarityIcons.add({
    'code-alt': require('!!svg-inline-loader!./icons/clarity-custom/code-alt.svg'),
    'file-ext': require('!!svg-inline-loader!./icons/clarity-custom/file-ext.svg'),
    'indented-view-list': require('!!svg-inline-loader!./icons/clarity-custom/indented-view-list.svg')
  })
}
