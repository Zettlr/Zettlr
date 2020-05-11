/* global */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        makeTemplate function
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This function retrieves templates.
 *
 * END HEADER
 */

const handlebars = require('./assets/handlebars/handlebars.runtime.js')
const { trans } = require('./lang/i18n')

function makeTemplate (cat, tpl, data = {}) {
  /**
   * Translates strings within the templates
   * @param  {String} str              The translatable
   * @param  {String} [str2=undefined] An optional second part (needed for variables)
   * @return {Object}                  SafeString containing the translated text
   */
  handlebars.registerHelper('i18n', function (str, str2 = undefined) {
    // Return a SafeString, so that handlebars doesn't escape potential strong-tags etc.
    let second = (str2 && typeof str2 === 'string') ? str2 : ''
    return new handlebars.SafeString(trans(str + second))
  })

  /**
   * Checks if an element is contained in the given array.
   * @param  {Mixed} elem    The element to be searched for.
   * @param  {Array} arr     The array in which the element should be found.
   * @param  {Object} options The context object.
   * @return {Mixed}         Either fn (= true) or inverse (= false).
   */
  handlebars.registerHelper('ifIn', function (elem, arr, options) {
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
  handlebars.registerHelper('transDict', function (lang) {
    let query = 'dialog.preferences.app_lang.' + lang
    let ret = trans(query)
    // If the language has not been translated return the language code
    if (ret === query) return lang
    // Please note that we are not returning SafeStrings as this is unnecessary.
    // There is no reason for anybody to hide HTML in the language translations.
    return ret
  })

  // Allow operator if-clauses, thanks to https://stackoverflow.com/a/16315366!
  handlebars.registerHelper('ifCond', function (v1, op, v2, options) {
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

  // Now require, process and return
  try {
    let precompiled = require(`./assets/tpl/${cat}/${tpl}.handlebars.js`)
    return handlebars.template(precompiled)(data)
  } catch (e) {
    console.error(e.message, e)
    return false
  }
}

module.exports = makeTemplate
