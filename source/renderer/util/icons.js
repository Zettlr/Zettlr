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
const fs = require('fs')
const path = require('path')

function loadCustomIcons (dir) {
  fs.readdir(dir, { withFileTypes: true }, (err, list) => {
    if (err) throw err
    list.forEach(x => {
      if (x.isDirectory()) {
        loadCustomIcons(path.join(dir, x.name))
      } else if (x.isFile()) {
        let ext = path.extname(x.name)
        if (ext && ext.toLowerCase() === '.svg') {
          fs.readFile(path.join(dir, x.name), (err, data) => {
            if (err) throw err
            let icon = {}
            icon[path.basename(x.name, ext)] = data.toString()
            clarityIcons.add(icon)
          })
        }
      }
    })
  })
}

module.exports = {
  loadCustomIcons: function () {
    loadCustomIcons(path.join(__dirname, '../assets/icons'))
  }
}
