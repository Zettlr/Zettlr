/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a utility function to check for attachments.
 *
 * END HEADER
 */

const path = require('path')
const isFile = require('./is-file')

/**
 * This function determines whether or not a given path describes an attachment.
 * @param  {string}  p The path to be checked.
 * @return {Boolean}   Returns true, if the path is an attachment, or false.
 */
module.exports = function (p) {
  let ext = global.config.get('attachmentExtensions')
  if (!ext) {
    // Something went wrong on init. Hey GettlrConfig, are you even there?
    return false
  }

  return isFile(p) && ext.includes(path.extname(p).toLowerCase())
}
