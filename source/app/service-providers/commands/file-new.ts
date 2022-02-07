/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        FileNew command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command creates a new file.
 *
 * END HEADER
 */

import ZettlrCommand from './zettlr-command'
import { trans } from '@common/i18n-main'
import path from 'path'
import sanitize from 'sanitize-filename'
import { codeFileExtensions, mdFileExtensions } from '@providers/fsal/util/valid-file-extensions'
import generateFilename from '@common/util/generate-filename'

const CODEFILE_TYPES = codeFileExtensions(true)
const ALLOWED_FILETYPES = mdFileExtensions(true)

export default class FileNew extends ZettlrCommand {
  constructor (app: any) {
    super(app, [ 'file-new', 'new-unsaved-file' ])
  }

  /**
   * Create a new file.
   * @param {String} evt The event name
   * @param  {Object} arg An object containing a hash of containing directory and a file name.
   * @return {void}     This function does not return anything.
   */
  async run (evt: string, arg: { name?: string, path?: string, type?: 'md'|'yaml'|'json'|'tex' }): Promise<void> {
    // A few notes on how this command works with respect to its input. As you
    // can see, all parameters are optional and all which are missing will be
    // inferred from context (otherwise the command will fail). The type
    // defaults to Markdown, obviously, the path to the current directory and
    // the name has the following function: If it is given, the user will not
    // be asked for a filename, but if it's missing, a new name will be
    // generated and the user is asked to confirm the name.
    const shouldPromptUser = this._app.config.get('newFileDontPrompt') === false
    const type = (arg.type !== undefined) ? arg.type : 'md'
    const filenamePattern = this._app.config.get('newFileNamePattern')
    const idGenPattern = this._app.config.get('zkn.idGen')
    const generatedName = generateFilename(filenamePattern, idGenPattern)

    if (evt === 'new-unsaved-file' && shouldPromptUser) {
      // We should simply create a new unsaved file that only resides in memory
      const file = await this._app.documents.newUnsavedFile(type)
      // Set it as active
      this._app.documents.activeFile = file
      return // Return early
    }

    let dir = this._app.fsal.openDirectory

    if (arg?.path !== undefined) {
      dir = this._app.fsal.findDir(arg.path)
    }

    if (dir === null) {
      this._app.log.error(`Could not create new file ${arg.name as string}: No directory selected!`)
      return
    }

    // Make sure we have a filename and have the user confirm this if applicable
    if (arg.name === undefined && shouldPromptUser) {
      // The user wishes to confirm the filename
      const chosenPath = await this._app.windows.saveFile(path.join(dir.path, generatedName))
      if (chosenPath === undefined) {
        this._app.log.info('Did not create new file since the dialog was aborted.')
        return
      }

      arg.name = path.basename(chosenPath)
      // The user may also have selected a different directory altogether. If
      // that directory exists and is loaded by the FSAL, overwrite the dir.
      if (path.dirname(chosenPath) !== dir.path) {
        dir = this._app.fsal.findDir(path.dirname(chosenPath))
        if (dir === null) {
          // TODO: Better feedback to the user!
          this._app.log.error(`Could not create new file ${arg.name}: The selected directory is not loaded in Zettlr!`)
          return
        }
      }
    } else if (arg.name === undefined) {
      // Just generate a name.
      arg.name = generatedName
    }

    try {
      // Then, make sure the name is correct.
      let filename = sanitize(arg.name.trim(), { 'replacement': '-' })
      if (filename === '') {
        throw new Error('Could not create file: Filename was not valid')
      }

      // If no valid filename is provided, assume .md
      const ext = path.extname(filename).toLowerCase()
      if (type !== 'md') {
        // The user has explicitly requested a code file so we must respect
        // the decision.
        if (type === 'tex' && ext !== '.tex') {
          filename += '.tex'
        } else if (type === 'json' && ext !== '.json') {
          filename += '.json'
        } else if (type === 'yaml' && ![ '.yaml', '.yml' ].includes(ext)) {
          filename += '.yaml'
        }
      } else if (!ALLOWED_FILETYPES.includes(ext) && !CODEFILE_TYPES.includes(ext)) {
        filename += '.md'
      }

      // Check if there's already a file with this name in the directory
      // NOTE: There are case-sensitive file systems, but we'll disallow this
      let found = dir.children.find(e => e.name.toLowerCase() === filename.toLowerCase())
      if (found !== undefined && found.type !== 'directory') {
        // Ask before overwriting
        if (!await this._app.windows.shouldOverwriteFile(filename)) {
          return
        } else {
          // Remove the file before creating it anew. We'll use the
          // corresponding command for that.
          await this._app.fsal.removeFile(found)
        }
      }

      // First create the file
      await this._app.fsal.createFile(dir, {
        name: filename,
        content: '',
        type: (type === 'md') ? 'md' : 'code'
      })

      // And directly thereafter, open the file
      await this._app.documents.openFile(path.join(dir.path, filename), true)
    } catch (err: any) {
      this._app.log.error(`Could not create file: ${err.message as string}`)
      this._app.windows.prompt({
        type: 'error',
        title: trans('system.error.could_not_create_file'),
        message: err.message
      })
    }
  }
}
