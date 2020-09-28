/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * Maintainer:      Aigeruth
 * License:         GNU GPL v3
 *
 * Description:     Utility function to render a template string
 *
 * END HEADER
 */

module.exports = function (templateString, dom = document) {
  const template = dom.createElement('template')
  template.innerHTML = templateString
  return template.content.cloneNode(true)
}
