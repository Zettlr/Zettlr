/* global */
/**
 * @ignore
 * BEGIN HEADER
 *
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This function retrieves templates.
 *
 * END HEADER
 */

// Register extra helpers to handlebar
// Based on https://github.com/pcardune/handlebars-loader/issues/110#issuecomment-401445723

const Handlebars = require('handlebars/runtime')
const { trans } = require('./i18n')

/**
 * Translates strings within the templates
 * @param  {String} str              The translatable
 * @param  {String} [str2=undefined] An optional second part (needed for variables)
 * @return {Object}                  SafeString containing the translated text
 */
Handlebars.registerHelper('i18n', function (str, str2 = undefined) {
  // Return a SafeString, so that handlebars doesn't escape potential strong-tags etc.
  let second = (str2 && typeof str2 === 'string') ? str2 : ''
  return new Handlebars.SafeString(trans(str + second))
})

/**
 * Translates strings passing a value to the helper
 *
 * @param   {String}  str         The identifier
 * @param   {Mixed}  value        The value to be passed
 *
 * @return  {Object}              SafeString containing the translated text
 */
Handlebars.registerHelper('i18n_value', function (str, value) {
  return new Handlebars.SafeString(trans(str, value))
})

/**
 * Checks if an element is contained in the given array.
 * @param  {Mixed} elem    The element to be searched for.
 * @param  {Array} arr     The array in which the element should be found.
 * @param  {Object} options The context object.
 * @return {Mixed}         Either fn (= true) or inverse (= false).
 */
Handlebars.registerHelper('ifIn', function (elem, arr, options) {
  // Check if we've got an array
  if (!Array.isArray(arr)) return options.inverse(this)

  // Now perform the check
  if (arr.indexOf(elem) > -1) return options.fn(this)
  return options.inverse(this)
})

/**
 * Does not return the full string if the language is not found, but rather the
 * last part (in this case: the BCP 47 language string).
 * @param  {String} lang             The language code to be localised
 * @return {String}                  A string containing the language.
 */
Handlebars.registerHelper('transDict', function (lang) {
  let query = 'dialog.preferences.app_lang.' + lang
  let ret = trans(query)
  // If the language has not been translated return the language code
  if (ret === query) return lang
  // Please note that we are not returning SafeStrings as this is unnecessary.
  // There is no reason for anybody to hide HTML in the language translations.
  return ret
})

// Allow operator if-clauses, thanks to https://stackoverflow.com/a/16315366!
Handlebars.registerHelper('ifCond', function (v1, op, v2, options) {
  switch (op) {
    case '=':
      return (v1 === v2) ? options.fn(this) : options.inverse(this)
    case '!=':
      return (v1 !== v2) ? options.fn(this) : options.inverse(this)
    case '<':
      return (v1 < v2) ? options.fn(this) : options.inverse(this)
    case '<=':
      return (v1 <= v2) ? options.fn(this) : options.inverse(this)
    case '>':
      return (v1 > v2) ? options.fn(this) : options.inverse(this)
    case '>=':
      return (v1 >= v2) ? options.fn(this) : options.inverse(this)
    case '&&':
      return (v1 && v2) ? options.fn(this) : options.inverse(this)
    case '||':
      return (v1 || v2) ? options.fn(this) : options.inverse(this)
    default:
      return options.inverse(this)
  }
})

/**
 * Handlebars runtime with custom helpers.
 * Used by handlebars-loader.
 */
module.exports = Handlebars
