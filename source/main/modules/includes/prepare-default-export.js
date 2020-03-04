/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        defaultModule
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Prepares a default file export. This can include,
 *                  but is not limited to providing a custom template,
 *                  some other file modifications and syntactic sugar.
 *
 * END HEADER
 */

const fs = require('fs').promises
const path = require('path')

module.exports = async function (options) {
  // We have a custom HTML template which we'd like to use
  if (options.format === 'html') {
    let tpl = await fs.readFile(path.join(__dirname, '../../assets/export.tpl.htm'), { encoding: 'utf8' })
    options.template = path.join(options.dest, 'template.tpl')
    options.discardTemplate = true
    await fs.writeFile(options.template, tpl, { encoding: 'utf8' })
  }

  // Make sure the file endings are correct
  if (options.format === 'plain') options.targetFile = options.targetFile.replace('.plain', '.txt')
  if (options.format === 'latex') options.targetFile = options.targetFile.replace('.latex', '.tex')
}
