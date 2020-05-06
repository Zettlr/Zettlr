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

module.exports = {
  'parse': async function (absPath, parent) {
    return {
      'parent': parent,
      'path': absPath,
      'name': path.basename(absPath),
      'hash': hash(absPath),
      'ext': path.extname(absPath),
      'type': 'attachment'
    }
  },
  'metadata': function (attachment) {
    return {
      // By only passing the hash, the object becomes
      // both lean AND it can be reconstructed into a
      // circular structure with NO overheads in the
      // renderer.
      'parent': (attachment.parent) ? attachment.parent.hash : null,
      'path': attachment.path,
      'name': attachment.name,
      'hash': attachment.hash,
      'ext': attachment.ext,
      'type': attachment.type
    }
  }
}
