/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        GetTranslationMetadata command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command returns the metadata for all translation files.
 *
 * END HEADER
 */

const ZettlrCommand = require('./zettlr-command')
const getMetadata = require('../../common/lang/i18n.js').getTranslationMetadata

class GetTranslationMetadata extends ZettlrCommand {
  constructor (app) {
    super(app, 'get-translation-metadata')
  }

  /**
    * Returns the translation metadata.
    * @param {String} evt The event name.
    * @param {Object} arg The argument given to the command.
    */
  run (evt, arg) {
    return getMetadata()
  }
}

module.exports = GetTranslationMetadata
