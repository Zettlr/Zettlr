/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        SaveFile command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command saves the current file.
 *
 * END HEADER
 */

const ZettlrCommand = require('./zettlr-command')
const generateFilename = require('../../common/util/generate-filename')

class SaveFile extends ZettlrCommand {
  constructor (app) {
    super(app, 'file-save')
  }

  /**
    * Saves a file. A file MUST be given, for the content is needed to write to
    * a file. Content is always freshly grabbed from the CodeMirror content.
    * @param {String} evt The event name
    * @param  {Object} file An object containing some properties of the file.
    * @return {void}      This function does not return.
    */
  async run (evt, file) {
    if ((file == null) || !file.hasOwnProperty('content')) {
      global.log.error('Could not save file, it\'s either null or has no content', file)
      // No file given -> abort saving process
      return false
    }

    try {
      let realFile = this._app.getFileSystem().findFile(file.hash)
      if (!realFile) {
        console.log('No file found - creating')
        realFile = await this._app.getFileSystem().runAction('create-file', {
          'source': this._app.getCurrentDir(),
          'info': generateFilename()
        })
      }

      global.log.info(`Saving file ${realFile.name} (modtime ${realFile.modtime})...`)
      await this._app.getFileSystem().runAction('save-file', {
        'source': realFile,
        'info': file.content
      })

      // Update word count
      this._app.stats.updateWordCount(file.offsetWordcount || 0)

      global.log.info(`File ${realFile.name} saved! New modtime: ${realFile.modtime}.`)

      // Mark this file as clean
      global.ipc.send('mark-clean', { 'hash': realFile.hash })
      // Re-send the file
      global.application.fileUpdate(realFile.hash, global.application.findFile(realFile.hash))
    } catch (e) {
      global.log.error(`Error saving file: ${e.message}!`, e)
    }

    return true
  }
}

module.exports = SaveFile
