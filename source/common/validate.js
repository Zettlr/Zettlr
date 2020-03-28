const GettlrValidation = require('./gettlr-validation.js')
const VALIDATE_PROPERTIES = Object.keys(require('./validation.json'))
const VALIDATE_RULES = Object.values(require('./validation.json'))

module.exports = function (data) {
  // Validate the given form data.
  if (!data) throw new Error('No data given!')

  let unvalidated = []
  for (let key in data) {
    if (VALIDATE_PROPERTIES.includes(key)) {
      let rule = VALIDATE_RULES[VALIDATE_PROPERTIES.indexOf(key)]
      let val = new GettlrValidation(key, rule)
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
