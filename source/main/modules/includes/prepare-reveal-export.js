/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        revealModule
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Prepares the output struct for revealJS presentations.
 *
 * END HEADER
 */

const fs = require('fs').promises
const path = require('path')

module.exports = async function (options) {
  // Set the template option so that the pandoc runner knows it should use it
  options.template = path.join(options.dest, 'revealjs.tpl')
  // Indicate to the Pandoc-runner that this template can be safely discared
  options.discardTemplate = true

  let revealTpl = path.join(__dirname, '../../assets/template.revealjs.htm')
  let revealStyle = path.join(__dirname, `../../assets/revealjs-styles/${options.revealJSStyle}.css`)

  // Now do the magic
  let tpl = await fs.readFile(revealTpl, 'utf8')
  tpl = tpl.replace('$style$', await fs.readFile(revealStyle, 'utf8'))
  await fs.writeFile(options.template, tpl, 'utf8')
}
