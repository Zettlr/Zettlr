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
  /* eslint-disable import/no-webpack-loader-syntax */
  clarityIcons.add({
    'code-alt.svg': require('!!svg-inline-loader!./../assets/icons/clarity-custom/code-alt.svg'),
    'file-ext.svg': require('!!svg-inline-loader!./../assets/icons/clarity-custom/file-ext.svg'),
    'indented-view-list.svg': require('!!svg-inline-loader!./../assets/icons/clarity-custom/indented-view-list.svg')
  })
}

module.exports = () => loadCustomIcons()
