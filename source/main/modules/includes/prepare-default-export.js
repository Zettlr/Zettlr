/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        defaultModule
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Prepares a default export with no magic from Zettlr.
 *
 * END HEADER
 */

module.exports = async function (options) {
  // Here we currently don't apply anything, because
  // everything is already set for a default file
  // export. However, what we could be doing was,
  // for instance, provide custom templates for all
  // files that support this. Or do other magic stuff
  // before Pandoc takes over.
}
