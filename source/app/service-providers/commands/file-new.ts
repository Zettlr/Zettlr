import ZettlrCommand from './zettlr-command'
import { trans } from '@common/i18n-main'
import path from 'path'
import sanitize from 'sanitize-filename'
import generateFilename from '@common/util/generate-filename'
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
    const { newFileDontPrompt, newFileNamePattern } = this._app.config.get()
    const type = arg.type ?? 'md'
    const generatedName = generateFilename(newFileNamePattern, this._app.config.get().zkn.idGen, type)

    const leafId = arg.leafId

    if (arg.windowId === undefined) {
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

    let dirpath = app.getPath('documents')
    const { openDirectory } = this._app.config.get()
    let isFallbackDir = true
    if (typeof arg.path === 'string' && await this._app.fsal.isDir(arg.path)) {
      dirpath = arg.path
      isFallbackDir = false
    } else if (openDirectory !== null && await this._app.fsal.isDir(openDirectory)) {
      dirpath = openDirectory
      isFallbackDir = false
    }

    if (
      (arg.name === undefined && !newFileDontPrompt) ||
      (newFileDontPrompt && isFallbackDir)
    ) {
      let defaultFileName = generatedName
      // Add the extension to the filename based on the selected type
      switch (type) {
        case 'json':
          if (!defaultFileName.endsWith('.json')) {
            defaultFileName += '.json'  // Ensure the default extension for JSON files
          }
          break
        case 'yaml':
          if (!defaultFileName.endsWith('.yaml')) {
            defaultFileName += '.yaml'  // Ensure the default extension for YAML files
          }
          break
        case 'tex':
          if (!defaultFileName.endsWith('.tex')) {
            defaultFileName += '.tex'  // Ensure the default extension for TEX files
          }
          break
        default: // Default to MD
          if (!defaultFileName.endsWith('.md')) {
            defaultFileName += '.md'  // Ensure the default extension for Markdown files
          }
      }
      const chosenPath = await this._app.windows.saveFile(path.join(dirpath, defaultFileName))
      if (chosenPath === undefined) {
        this._app.log.info('Did not create new file since the dialog was aborted.')
        return
      }

      arg.name = path.basename(chosenPath)
      if (path.dirname(chosenPath) !== dirpath) {
        dirpath = path.dirname(chosenPath)
      }
    } else if (arg.name === undefined) {
      arg.name = generatedName
    }

    try {
      let filename = sanitize(arg.name.trim(), { replacement: '-' })
      if (filename === '') {
        throw new Error('Could not create file: Filename was not valid')
      }

      // Check if the file already has an extension, and don't add the default extension if it does
      if (!path.extname(filename)) {
        switch (type) {
          case 'json':
            filename += '.json'
            break
          case 'yaml':
            filename += '.yml'
            break
          case 'tex':
            filename += '.tex'
            break
          default: // Default to MD
            filename += '.md'
        }
      }

      const absPath = path.join(dirpath, filename)

      if (await this._app.fsal.pathExists(absPath)) {
        if (!await this._app.windows.shouldOverwriteFile(filename)) {
          return
        } else {
          this._app.documents.closeFileEverywhere(absPath)
          await this._app.fsal.removeFile(absPath)
        }
      }

      await this._app.fsal.writeTextFile(absPath, '')
      await this._app.documents.openFile(windowId, leafId, absPath, true)

      if (this._app.workspaces.findDir(path.dirname(absPath)) === undefined) {
        this._app.config.addPath(absPath)
      }
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
