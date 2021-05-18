/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Converts a shallow object with dot-noted properties into an
 *                  object with the respective sub-objects.
 *
 *                  Example:
 *
 *           Input: { 'option.sub.key': true }
 *          Output: { 'option': { 'sub': { 'key': true } } }
 *
 * END HEADER
 */

/**
 * Turns a shallow object with dot-notation into a deep object.
 * @param {object} options The shallow input object
 * @returns {object} The expanded deep object
 */
module.exports = function (options) {
  let obj = {}

  for (let option of Object.keys(options)) {
    if (option.indexOf('.') > 0) {
      // Splits, e.g. option.sublevel.property
      let nested = option.split('.')
      let lastProperty = nested.pop()
      let pointer = obj

      // Create new subobjects as necessary
      for (let key of nested) {
        if (!pointer.hasOwnProperty(key)) pointer[key] = {}
        pointer = pointer[key]
      }
      pointer[lastProperty] = options[option]
    } else {
      // Non-nested property
      obj[option] = options[option]
    }
  }

  return obj
}
