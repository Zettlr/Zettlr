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

const { enumDictFiles } = require('../lang/i18n')

/**
 * This function checks the integrity of a given dictionary. Simply pass it the
 * language code and it will tell you whether or not a dictionary exists at one
 * of these paths.
 * @param  {String}  lang The language code (e.g. it-IT)
 * @return {Boolean}      True, if a valid hunspell dict was found, otherwise false.
 */
module.exports = function (lang) {
  return enumDictFiles().find(elem => elem.tag === lang) !== undefined
}
