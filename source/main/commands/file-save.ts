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
import { codeFileExtensions, mdFileExtensions } from '../../common/get-file-extensions'

const ALLOWED_FILETYPES = mdFileExtensions(true)
const CODE_FILETYPES = codeFileExtensions(true)

export default class SaveFile extends ZettlrCommand {
  constructor (app: any) {
    super(app, 'file-save')
  }

  /**
    * Saves a file. A file MUST be given, for the content is needed to write to
    * a file. Content is always freshly grabbed from the CodeMirror content.
    *
    * @param  {string}            evt   The event name
    * @param  {any}               file  An object containing some properties of the file.
    * @return {Promise<boolean>}        Returns true on successful run.
    */
  async run (evt: string, file: any): Promise<boolean> {
    if ((file == null) || !('newContents' in file)) {
      global.log.error('Could not save file, it\'s either null or has no content', file)
      // No file given -> abort saving process
      return false
    }

    try {
      const realFile = this._app.getDocumentManager().openFiles.find(elem => elem.path === file.path)
      if (realFile === undefined) {
        throw new Error('File to save not found!')
      }

      global.log.info(`Saving file ${realFile.name}...`)
      if (realFile.dir === ':memory:') {
        // We should save an in-memory file. We can make use of a few other
        // commands and methods to achieve that.
        // But first of all, we need to ask for a file path. Prepend the
        // realFile.name with the currently selected directory, if possible, so
        // that the dialog starts in an expected place.
        const selectedDir = this._app.getFileSystem().openDirectory?.path
        const startPath = (selectedDir !== undefined) ? path.join(selectedDir, realFile.name) : realFile.name
        let newPath = await this._app.saveFile(startPath)

        if (newPath === undefined) {
          global.log.warning('[App] No path for the file to save provided. Aborting save.')
          return false
        }

        // Make sure there is a correct ending supplied
        const ext = path.extname(newPath).toLowerCase()
        if (!ALLOWED_FILETYPES.includes(ext) && !CODE_FILETYPES.includes(ext)) {
          newPath += '.md'
        }

        // Now that we have a name, create a corresponding file! NOTE we're
        // creating the file here CIRCUMVENTING THE FSAL. The reason is that the
        // user might also select a directory not loaded. However, no matter
        // where a file is located, the openFile() method will make sure it'll
        // get added as a root if it's not within the file tree.
        global.log.info(`Saving file to ${newPath}...`)
        await fs.writeFile(newPath, file.newContents)

        // Now that the file exists we can close the "untitled" file and
        // immediately open the file just created. Also, don't forget to set it
        // as "active" so that the user doesn't notice that we actually replaced
        // the file.
        this._app.getDocumentManager().closeFile(realFile)
        const descriptor = await this._app.getDocumentManager().openFile(newPath)
        this._app.getDocumentManager().activeFile = descriptor
      } else {
        // Save a normal file
        await this._app.getDocumentManager().saveFile(realFile, file.newContents)
      }

      // Update word count
      global.stats.increaseWordCount(file.offsetWordCount)

      global.log.info(`File ${realFile.name} saved.`)
      return true
    } catch (err: any) {
      global.log.error(`Error saving file: ${err.message as string}`, err)
      return false
    }
  }
}

module.exports = SaveFile
