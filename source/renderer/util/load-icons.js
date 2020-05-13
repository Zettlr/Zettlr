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
const fs = require('fs').promises
const path = require('path')

function loadCustomIcons (dir) {
  return fs.readdir(dir, { withFileTypes: true })
    .then(list => Promise.all(list.map(x => {
      if (x.isDirectory()) {
        return loadCustomIcons(path.join(dir, x.name))
      } else if (x.isFile()) {
        let ext = path.extname(x.name)
        if (ext && ext.toLowerCase() === '.svg') {
          return fs.readFile(path.join(dir, x.name)).then(data => {
            let icon = {}
            icon[path.basename(x.name, ext)] = data.toString()
            clarityIcons.add(icon)
          })
        }
      }
    })))
}

module.exports = () => loadCustomIcons(path.join(__dirname, '../assets/icons'))
