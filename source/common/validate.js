/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Validator
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This function can validate some data based on validation rules.
 *
 * END HEADER
 */

const ZettlrValidation = require('./zettlr-validation.js')
const VALIDATE_PROPERTIES = Object.keys(require('./validation.json'))
const VALIDATE_RULES = Object.values(require('./validation.json'))

module.exports = function (data) {
  // Validate the given form data.
  if (data === undefined) {
    throw new Error('No data given!')
  }

  let unvalidated = []
  for (let key in data) {
    if (VALIDATE_PROPERTIES.includes(key)) {
      let rule = VALIDATE_RULES[VALIDATE_PROPERTIES.indexOf(key)]
      let val = new ZettlrValidation(key, rule)
      if (!val.validate(data[key])) {
        unvalidated.push({
          'key': key,
          'reason': val.why()
        })
      }
    }
  }
  return unvalidated
}
