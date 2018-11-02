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
const { trans } = require('../common/lang/i18n.js')

function makeTemplate (cat, tpl, data = {}) {
  handlebars.registerHelper('i18n', function (str, str2 = undefined) {
    // Return a SafeString, so that handlebars doesn't escape potential strong-tags etc.
    let second = (str2 && typeof str2 === 'string') ? str2 : ''
    return new handlebars.SafeString(trans(str + second))
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
    return false
  }
}

module.exports = makeTemplate
