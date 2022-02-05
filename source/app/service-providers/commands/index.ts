/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Command loader
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file simply imports all commands, and exports them in
 *                  a unified object for easy instantiation by zettlr.ts.
 *
 * END HEADER
 */

import DirDelete from './dir-delete'
import DirNewProject from './dir-new-project'
import DirNew from './dir-new'
import DirProjectExport from './dir-project-export'
import DirRemoveProject from './dir-remove-project'
import DirRename from './dir-rename'
import DirRescan from './dir-rescan'
import DirSetIcon from './dir-set-icon'
import DirSort from './dir-sort'
import Export from './export'
import FileClose from './file-close'
import FileDelete from './file-delete'
import FileDuplicate from './file-duplicate'
import FileNew from './file-new'
import FileRename from './file-rename'
import FileSave from './file-save'
import FileSearch from './file-search'
import ForceOpen from './force-open'
import FileFindAndReturnMetaData from './file-find-and-return-meta-data'
import ImportLangFile from './import-lang-file'
import ImportFiles from './import'
import IncreasePomodoro from './increase-pomodoro'
import OpenAttachment from './open-attachment'
import Print from './print'
import RequestMove from './request-move'
import RootClose from './root-close'
import RootOpen from './root-open'
import SaveImageFromClipboard from './save-image-from-clipboard'
import SortOpenFiles from './sort-open-files'
import TutorialOpen from './tutorial-open'
import UpdateProjectProperties from './update-project-properties'
import UpdateUserDictionary from './update-user-dictionary'
import ProviderContract from '@providers/provider-contract'
import AppServiceContainer from 'source/app/app-service-container'
import ZettlrCommand from './zettlr-command'
import SetOpenDirectory from './set-open-directory'
import { MDFileDescriptor } from '@dts/main/fsal'
import { clipboard, ipcMain, nativeImage } from 'electron'

export const commands = [
  DirDelete,
  DirNewProject,
  DirNew,
  DirProjectExport,
  DirRemoveProject,
  DirRename,
  DirRescan,
  DirSetIcon,
  DirSort,
  Export,
  FileClose,
  FileDelete,
  FileDuplicate,
  FileNew,
  FileRename,
  FileSave,
  FileSearch,
  FileFindAndReturnMetaData,
  ForceOpen,
  ImportFiles,
  ImportLangFile,
  IncreasePomodoro,
  OpenAttachment,
  Print,
  RequestMove,
  RootClose,
  RootOpen,
  SaveImageFromClipboard,
  SetOpenDirectory,
  SortOpenFiles,
  TutorialOpen,
  UpdateProjectProperties,
  UpdateUserDictionary
]

export default class CommandProvider extends ProviderContract {
  private readonly _commands: ZettlrCommand[]

  // TODO: Right now this just injects the full service container into the
  // commands, but it mayt be better to only provide those which are actually
  // required.
  constructor (private readonly _app: AppServiceContainer) {
    super()
    // Load available commands
    this._commands = commands.map(Command => new Command(this._app))
  }

  /**
   * Runs a command through the application pipeline
   *
   * @param   {string}  command  The command to run
   * @param   {any}     payload  Any payload, as required depending on the command.
   *
   * @return  {Promise<any>}     The return from running the command
   */
  async run (command: string, payload: any): Promise<any> {
    // FIRST: Try to run a minimal command for which its own custom function
    // wouldn't make sense.
    if (command === 'get-statistics-data') {
      return this._app.fsal.statistics
    } else if (command === 'get-filetree-events') {
      return this._app.fsal.filetreeHistorySince(payload)
    } else if (command === 'get-descriptor') {
      const descriptor = this._app.fsal.find(payload)
      if (descriptor === null) {
        return null
      }
      return this._app.fsal.getMetadataFor(descriptor)
    } else if (command === 'get-open-directory') {
      const openDir = this._app.fsal.openDirectory
      if (openDir === null) {
        return null
      }

      return this._app.fsal.getMetadataFor(openDir)
    } else if (command === 'get-active-file') {
      const descriptor = this._app.documents.activeFile
      if (descriptor === null) {
        return null
      }

      return this._app.fsal.getMetadataFor(descriptor as MDFileDescriptor)
    } else if (command === 'next-file') {
      // Trigger a "forward" command on the document manager
      await this._app.documents.forward()
      return true
    } else if (command === 'previous-file') {
      // Trigger a "back" command on the document manager
      await this._app.documents.back()
      return true
    } else if (command === 'set-writing-target') {
      // Sets or updates a file's writing target
      this._app.targets.set(payload)
    } else if (command === 'open-file') {
      await this._app.documents.openFile(payload.path, payload.newTab)
      return true
    } else if (command === 'get-open-files') {
      // Return all open files as their metadata objects
      return this._app.documents.openFiles.map(file => this._app.fsal.getMetadataFor(file))
    } else if (command === 'copy-img-to-clipboard') {
      // We should copy the contents of an image file to clipboard. Payload
      // contains the image path. We can rely on the Electron framework here.
      let imgPath: string = payload
      if (imgPath.startsWith('safe-file://')) {
        imgPath = imgPath.replace('safe-file://', '')
      } else if (imgPath.startsWith('file://')) {
        imgPath = imgPath.replace('file://', '')
      }

      const img = nativeImage.createFromPath(imgPath)

      if (!img.isEmpty()) {
        clipboard.writeImage(img)
      }
      return true
    } else if (command === 'get-file-contents') {
      // First, attempt to get the contents from the document manager
      const file = this._app.documents.openFiles.find(file => file.path === payload)
      if (file !== undefined) {
        return await this._app.documents.getFileContents(file)
      }

      // Otherwise, try to find the file via the FSAL
      const descriptor = this._app.fsal.findFile(payload)
      if (descriptor === null) {
        return null
      }

      return await this._app.fsal.getFileContents(descriptor)
    } else if (command === 'update-modified-files') {
      // Update the modification status according to the file path array given
      // in the payload.
      this._app.documents.updateModifiedFlags(payload)
      this._app.windows.setModified(!this._app.documents.isClean())
    } else if (command === 'open-preferences') {
      this._app.windows.showPreferences()
      return true
    } else if (command === 'open-quicklook') {
      const file = this._app.fsal.findFile(payload)
      if (file === null || file.type !== 'file') {
        this._app.log.error(`[Application] A Quicklook window for ${payload as string} was requested, but the file was not found.`)
        return false
      }

      this._app.windows.showQuicklookWindow(file)
      return true
    } else if (command === 'open-stats-window') {
      this._app.windows.showStatsWindow()
      return true
    } else if (command === 'open-update-window') {
      this._app.windows.showUpdateWindow()
    } else if (command === 'open-project-preferences') {
      this._app.windows.showProjectPropertiesWindow(payload)
    } else {
      // ELSE: If the command has not yet been found, try to run one of the
      // bigger commands
      const cmd: ZettlrCommand|undefined = this._commands.find((elem: ZettlrCommand) => elem.respondsTo(command))
      if (cmd !== undefined) {
        // Return the return value of the command, if there is any
        try {
          return await cmd.run(command, payload)
        } catch (err: any) {
          this._app.log.error('[Application] Error received while running command: ' + String(err.message), err)
          return false
        }
      } else {
        this._app.log.warning(`[Application] Received a request to run command ${command}, but it's not registered.`)
      }
    }
  }

  async boot (): Promise<void> {
    this._app.log.verbose('Command Provider booting up ...')
    // Set up the command listener here
    ipcMain.handle('application', async (event, { command, payload }) => {
      return await this.run(command, payload)
    })
  }

  async shutdown (): Promise<void> {
    this._app.log.verbose('Command Provider shutting down ...')
  }
}
