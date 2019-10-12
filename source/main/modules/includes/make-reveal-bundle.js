/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        revealModule
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Takes a revealJS-file and bundles it to a complete
 *                  presentation using the revealJS-template by Zettlr
 *                  and a corresponding style.
 *
 * END HEADER
 */

const fs = require('fs').promises
const path = require('path')

module.exports = async function (options) {
  // When this module is called, Pandoc had a run over the file already,
  // so all we need to do is read the file Pandoc has produced (it's
  // decidedly NOT standalone so we only have the body parts) which we
  // need to wrap in our custom template now.
  let file = await fs.readFile(options.targetFile, { encoding: 'utf8' })
  // Unlink the file, because it has the ending '.revealjs', which
  // the operating system won't open either way.
  await fs.unlink(options.targetFile)
  options.targetFile = options.targetFile + '.htm' // Make sure it's HTML

  // Load the template and the corresponding stylesheet.
  let revealTpl = path.join(__dirname, '../../assets/template.revealjs.htm')
  let tpl = await fs.readFile(revealTpl, { encoding: 'utf8' })

  let revealStyle = path.join(__dirname, `../../assets/revealjs-styles/${options.revealJSStyle}.css`)
  let style = await fs.readFile(revealStyle, { encoding: 'utf8' })

  // Now do the magic
  tpl = tpl.replace('$style$', style)
  tpl = tpl.replace('$body$', file)
  tpl = tpl.replace('$title$', options.file.name)

  await fs.writeFile(options.targetFile, tpl, 'utf8')
}
