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
const isDir = require('../../common/util/is-dir')

async function loadCustomIcons (dir) {
  let directoryContents = await fs.readdir(dir)
  for (let file of directoryContents) {
    let fullPath = path.join(dir, file)
    if (isDir(fullPath)) return loadCustomIcons(fullPath)

    let ext = path.extname(file)
    if (ext && ext.toLowerCase() === '.svg') {
      let content = await fs.readFile(fullPath, { encoding: 'utf8' })
      let icon = {}
      icon[path.basename(file, ext)] = content
      clarityIcons.add(icon)
    }
  }
}

module.exports = () => loadCustomIcons(path.join(__dirname, '../assets/icons'))
