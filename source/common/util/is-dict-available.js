/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a utility function to check dict existence.
 *
 * END HEADER
 */

const path = require('path')
const fs = require('fs')
const isFile = require('./is-file')

/**
 * This function checks the integrity of a given dictionary. Simply pass it the
 * language code and it will tell you whether or not a dictionary exists at one
 * of these paths.
 * @param  {String}  lang The language code (e.g. it_IT)
 * @return {Boolean}      True, if a valid hunspell dict was found, otherwise false.
 */
module.exports = function (lang) {
  let p = path.join(__dirname, '../main/assets/dict', lang)
  try {
    fs.lstatSync(p)
  } catch (e) {
    // Directory does not exist at the default path. Check custom path
    p = path.join(require('electron').app.getPath('userData'), 'dict', lang)
    try {
      fs.lstatSync(p)
    } catch (e) {
      return false // Not even there.
    }
  }

  // The directory exists. Now check for the existence of the dic and aff files.
  // p will hold either the path to the internal dicts or the custom.
  if (!isFile(path.join(p, lang + '.dic'))) {
    return false
  }
  if (!isFile(path.join(p, lang + '.aff'))) {
    return false
  }

  return true
}
