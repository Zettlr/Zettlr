/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a utility function to sanitise TeX values.
 *
 * END HEADER
 */

/**
* Sanitises a string so that it is safe to insert into a document.
* @param  {String} val The input.
* @return {String}     The sanitised output.
*/
module.exports = function (val) {
  // Escape or remove TeX command characters: # $ % ^ & _ { } ~ \
  val = val.replace(/(?<=[^\\]|^)([_#%&{}])/g, '\\$1')
  // Remove those that cannot be rendered
  val = val.replace(/[$^~\\]/g, '')
  return val
}
