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

import ZettlrCommand from './zettlr-command'
import { promises as fs } from 'fs'
import path from 'path'
import { filetypes as ALLOWED_FILETYPES } from '../../common/data.json'

export default class SaveFile extends ZettlrCommand {
  constructor (app: any) {
    super(app, 'file-save')
  }

  /**
    * Saves a file. A file MUST be given, for the content is needed to write to
    * a file. Content is always freshly grabbed from the CodeMirror content.
    * @param {String} evt The event name
    * @param  {Object} file An object containing some properties of the file.
    * @return {void}      This function does not return.
    */
  async run (evt: string, file: any): Promise<boolean> {
    if ((file == null) || !file.hasOwnProperty('newContents')) {
      global.log.error('Could not save file, it\'s either null or has no content', file)
      // No file given -> abort saving process
      return false
    }

    try {
      let realFile = this._app.getFileSystem().findFile(file.path)
      if (realFile === null) {
        throw new Error('File to save not found!')
      }

      global.log.info(`Saving file ${realFile.name}...`)
      if (realFile.dir === ':memory:') {
        // We should save an in-memory file. We can make use of a few other
        // commands and methods to achieve that.
        // But first of all, we need to ask for a file path
        let newPath = await this._app.saveFile(realFile.name)

        if (newPath === undefined) {
          global.log.warning('[App] No path for the file to save provided. Aborting save.')
          return false
        }

        // Make sure there is a correct ending supplied
        if (!ALLOWED_FILETYPES.includes(path.extname(newPath).toLowerCase())) {
          newPath += '.md'
        }

        // Now that we have a name, create a corresponding file! NOTE we're
        // creating the file here CIRCUMVENTING THE FSAL. The reason is that the
        // user might also select a directory not loaded. However, no matter
        // where a file is located, the openFile() method will make sure it'll
        // get added as a root if it's not within the file tree.
        await fs.writeFile(newPath, file.newContents)

        // Now we can open the file ...
        await this._app.handleAddRoots([newPath])
        this._app.openFile(newPath)
        // ... and close the old one (note that closeFile will close a file
        // irrespective of the modification flag). Note additionally that we
        // explicitly open in a new tab to avoid the system asking the user
        // whether or not they want to close the ("modified") file.
        this._app.getFileSystem().closeFile(realFile)
      } else {
        // Save a normal file
        await this._app.getFileSystem().saveFile(realFile, file.newContents)
      }

      // Update word count
      global.stats.increaseWordCount(file.offsetWordCount)

      global.log.info(`File ${realFile.name} saved.`)
      return true
    } catch (e) {
      global.log.error(`Error saving file: ${e.message as string}`, e)
      return false
    }
  }
}

module.exports = SaveFile
