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

const clarityIcons = require('@clr/icons').ClarityIcons
require('@clr/icons/shapes/all-shapes')

async function loadCustomIcons () {
  // We use the svg-inline-loader, because clarity expects a plain svg string and not a javascript module
  /* eslint-disable import/no-webpack-loader-syntax */
  clarityIcons.add({
    'code-alt': require('!!svg-inline-loader!./../assets/icons/clarity-custom/code-alt.svg'),
    'file-ext': require('!!svg-inline-loader!./../assets/icons/clarity-custom/file-ext.svg'),
    'indented-view-list': require('!!svg-inline-loader!./../assets/icons/clarity-custom/indented-view-list.svg')
  })
}

module.exports = () => loadCustomIcons()
