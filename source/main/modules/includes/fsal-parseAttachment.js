/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        parseAttachment function
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     The attachment dummy object builder.
 *
 * END HEADER
 */

const path = require('path')
const hash = require('../../../common/util/hash')

module.exports = async function (absPath) {
  return {
    'path': absPath,
    'name': path.basename(absPath),
    'hash': hash(absPath),
    'ext': path.extname(absPath),
    'type': 'attachment'
  }
}
