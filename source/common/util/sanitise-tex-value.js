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
* Escape or remove TeX command characters: # $ % ^ & _ { } ~ \
* @param  {String} val The input.
* @return {String}     The sanitised output.
*/
module.exports = function (val) {
  // First remove those that cannot be rendered
  val = val.replace(/[$^~\\]/g, '')
  // Then escape the rest
  val = val.replace(/(?<!\\)([_#%&{}])/g, '\\$1')
  return val
}
