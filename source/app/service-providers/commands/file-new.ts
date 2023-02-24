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
import generateFilename from '@common/util/generate-filename'
import { hasMdOrCodeExt } from '@providers/fsal/util/is-md-or-code-file'
import { app } from 'electron'

export default class FileNew extends ZettlrCommand {
  constructor (app: any) {
    super(app, ['file-new'])
  }

  /**
   * Create a new file.
   * @param {String} evt The event name
   * @param  {Object} arg An object containing a hash of containing directory and a file name.
   * @return {void}     This function does not return anything.
   */
  async run (evt: string, arg: { leafId?: string, windowId?: string, name?: string, path?: string, type: 'md'|'yaml'|'json'|'tex' }): Promise<void> {
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
    const leafId = arg.leafId

    if (arg.windowId === undefined) {
      // The caller didn't provide a window number. This can happen with, e.g.
      // menu items. But since we want to fulfill the user's wish, we first try
      // to fallback onto any main window and only fail otherwise.
      const firstMainWindow = this._app.windows.getFirstMainWindow()
      if (firstMainWindow !== undefined) {
        arg.windowId = this._app.windows.getMainWindowKey(firstMainWindow)
      }
    }

    const windowId = arg.windowId

    if (windowId === undefined) {
      this._app.log.error('Cannot create new file: No window id provided')
      return
    }

    let dir = this._app.fsal.openDirectory ?? undefined

    if (arg?.path !== undefined) {
      dir = this._app.fsal.findDir(arg.path)
    }

    let isFallbackDir = false
    if (dir === undefined) {
      // There is no directory we could salvage, so choose a default one: the
      // documents directory. Displaying the file choosing dialog should never
      // fail because we can't decide on a directory.
      dir = await this._app.fsal.getAnyDirectoryDescriptor(app.getPath('documents'))
      isFallbackDir = true
    }

    // Make sure we have a filename and have the user confirm this if applicable
    // Also, if the user does not want to be prompted BUT we had to use the
    // fallback directory, we should also prompt the user as otherwise it would
    // be opaque to the user where the notes end up in.
    if ((arg.name === undefined && shouldPromptUser) || (!shouldPromptUser && isFallbackDir)) {
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
        dir = await this._app.fsal.getAnyDirectoryDescriptor(path.dirname(chosenPath))
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

      if (!hasMdOrCodeExt(filename)) {
        // There's no valid file extension given. We have to add one. By default
        // we assume Markdown, but let ourselves be guided by the given type.
        switch (type) {
          case 'json':
            filename += '.json'
            break
          case 'tex':
            filename += '.tex'
            break
          case 'yaml':
            filename += '.yml'
            break
          default:
            filename += '.md'
        }
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
        type: (type === 'md') ? 'file' : 'code'
      })

      // And directly thereafter, open the file
      await this._app.documents.openFile(windowId, leafId, path.join(dir.path, filename), true)
    } catch (err: any) {
      this._app.log.error(`Could not create file: ${err.message as string}`)
      this._app.windows.prompt({
        type: 'error',
        title: trans('Could not create file'),
        message: err.message
      })
    }
  }
}
